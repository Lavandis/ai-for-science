import cv2
import math
import asyncio
import os
import tempfile
import csv # 【新增】导入 csv 模块
from fastapi import FastAPI, UploadFile, File, Form, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = r"D:\yolov12-main\best.pt" 
print(f"正在加载模型: {MODEL_PATH} ...")
model = YOLO(MODEL_PATH)

@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    pendulumLength: float = Form(...),
    staticX: float = Form(...),
    pixelRatio: float = Form(...),
    fps: float = Form(...),
    savePath: str = Form(...)  # 【新增】接收前端传来的保存路径
):
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    content = await file.read()
    temp_video.write(content)
    temp_video.close()

    return {
        "video_path": temp_video.name,
        "pendulumLength": pendulumLength,
        "staticX": staticX,
        "pixelRatio": pixelRatio,
        "fps": fps,
        "savePath": savePath
    }

@app.websocket("/ws/track")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    csv_file = None
    try:
        config = await websocket.receive_json()
        video_path = config.get("video_path")
        pendulum_length = float(config.get("pendulumLength"))
        static_x = float(config.get("staticX"))
        pixel_ratio = float(config.get("pixelRatio"))
        real_fps = float(config.get("fps"))
        save_path = config.get("savePath") # 【新增】获取保存路径

        if not os.path.exists(video_path):
            await websocket.send_json({"error": "找不到视频文件"})
            return

        # 【新增】打开并初始化 CSV 文件
        csv_file = open(save_path, 'w', newline='', encoding='utf-8')
        csv_writer = csv.writer(csv_file)
        csv_writer.writerow(['Frame', 'Time_Sec', 'Center_X', 'Center_Y', 'Angle_rad'])

        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break 
            
            frame_count += 1
            time_sec = frame_count / real_fps

            results = model(frame, verbose=False, conf=0.3)
            
            cx_float, cy_float = None, None
            
            if results[0].keypoints is not None and results[0].keypoints.has_visible:
                kpts = results[0].keypoints.xy.cpu().numpy()  
                
                if len(kpts) > 0 and len(kpts[0]) > 0:
                    cx_float, cy_float = float(kpts[0][0][0]), float(kpts[0][0][1])
            
            if cx_float is not None and cy_float is not None and cx_float > 0 and cy_float > 0:
                delta_x_px = cx_float - static_x
                delta_x_cm = delta_x_px / pixel_ratio
                
                ratio = max(-1.0, min(1.0, delta_x_cm / pendulum_length))
                angle_rad = math.asin(ratio) # 计算弧度

                # 【新增】将当前帧的数据写入指定的 CSV 文件
                csv_writer.writerow([frame_count, f"{time_sec:.4f}", f"{cx_float:.4f}", f"{cy_float:.4f}", f"{angle_rad:.4f}"])

                await websocket.send_json({
                    "time": round(time_sec, 4),
                    "x": round(cx_float, 4),
                    "y": round(cy_float, 4),
                    "angle": round(angle_rad, 4) # 【修改】直接发送弧度数据
                })
            
            await asyncio.sleep(0) 

        cap.release()
        
        try:
            os.remove(video_path)
        except:
            pass
        
        await websocket.send_json({"status": "completed"})
        await websocket.close()

    except Exception as e:
        print(f"WebSocket 异常断开: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        # 【新增】无论正常结束还是被强行中断，都保证文件被正确保存和关闭
        if csv_file is not None and not csv_file.closed:
            csv_file.close()