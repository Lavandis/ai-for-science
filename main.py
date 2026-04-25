import cv2
import math
import asyncio
import os
import sys
import tempfile
import csv
import pandas as pd
import numpy as np
import torch
import traceback
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

# ==========================================
# 1. YOLO 视频跟踪模型初始化
# ==========================================
MODEL_PATH = r"best.pt" 
print(f"正在加载 YOLO 模型: {MODEL_PATH} ...")
try:
    model = YOLO(MODEL_PATH)
    print("YOLO 模型加载成功！")
except Exception as e:
    print(f"YOLO 模型加载失败: {e}")

# ==========================================
# 2. HTPE 模板匹配模型初始化
# ==========================================
HTPE_DIR = r"D:\Users\zp061\Desktop\HTPE"
HTPE_MODEL_PATH = r"src\best_model_cpu1.pt"

if HTPE_DIR not in sys.path:
    sys.path.append(HTPE_DIR)

htpe_model = None
try:
    from utils.functions import load_model_class
    from hydra import initialize_config_dir, compose
    from hydra.core.global_hydra import GlobalHydra
    
    print("正在加载 HTPE 模型配置和权重...")
    GlobalHydra.instance().clear()
    
    with initialize_config_dir(version_base=None, config_dir=os.path.join(HTPE_DIR, "conf")):
        cfg = compose(config_name="config")
        
    ModelClass = load_model_class(cfg.model.identifier)
    htpe_model = ModelClass(cfg.model)
    
    htpe_model.load_state_dict(torch.load(HTPE_MODEL_PATH, map_location=torch.device("cpu")))
    htpe_model.eval()
    print("HTPE 模型加载成功！")
except Exception as e:
    print(f"HTPE 模型加载失败: {e}")
    traceback.print_exc()

# ==========================================
# 3. API 路由
# ==========================================

@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    pendulumLength: float = Form(...),
    staticX: float = Form(...),
    pixelRatio: float = Form(...),
    fps: float = Form(...),
    savePath: str = Form(...)  
):
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    content = await file.read()
    temp_video.write(content)
    temp_video.close()
    return {
        "video_path": temp_video.name, "pendulumLength": pendulumLength,
        "staticX": staticX, "pixelRatio": pixelRatio, "fps": fps, "savePath": savePath
    }

@app.websocket("/ws/track")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    csv_file = None
    try:
        config = await websocket.receive_json()
        video_path, pendulum_length, static_x, pixel_ratio, real_fps, save_path = (
            config.get("video_path"), float(config.get("pendulumLength")), float(config.get("staticX")),
            float(config.get("pixelRatio")), float(config.get("fps")), config.get("savePath")
        )
        if not os.path.exists(video_path):
            await websocket.send_json({"error": "找不到视频文件"})
            return

        csv_file = open(save_path, 'w', newline='', encoding='utf-8')
        csv_writer = csv.writer(csv_file)
        # 注意这里：前端的 ImageRecognitionPage 生成的 CSV 是这个格式
        csv_writer.writerow(['Frame', 'Time_Sec', 'Center_X', 'Center_Y', 'Angle_rad'])

        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success: break 
            
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
                angle_rad = math.asin(ratio) 
                csv_writer.writerow([frame_count, f"{time_sec:.4f}", f"{cx_float:.4f}", f"{cy_float:.4f}", f"{angle_rad:.4f}"])
                await websocket.send_json({
                    "time": round(time_sec, 4), "x": round(cx_float, 4), "y": round(cy_float, 4), "angle": round(angle_rad, 4)
                })
            await asyncio.sleep(0) 
        cap.release()
        try: os.remove(video_path)
        except: pass
        await websocket.send_json({"status": "completed"})
        await websocket.close()
    except Exception as e:
        print(f"WebSocket 异常断开: {e}")
        try: await websocket.close()
        except: pass
    finally:
        if csv_file is not None and not csv_file.closed:
            csv_file.close()

# --- 新增的 HTPE 接口 ---
@app.post("/match-template")
async def match_template(file: UploadFile = File(...)):
    print(f"🔔 收到 HTPE 请求! 文件: {file.filename}")
    
    if htpe_model is None:
        return {"error": "HTPE模型未加载，请检查后端 Python 终端的启动日志。"}
        
    try:
        # 1. 读取 CSV 文件
        try:
            df = pd.read_csv(file.file, encoding='utf-8-sig')
        except Exception as e:
            return {"error": f"CSV读取失败: {str(e)}"}
            
        if df.empty: 
            return {"error": "CSV 是空的"}

        # 2. 提取角度列 (取最后一列)
        data = df.iloc[:, -1].values
        
        # 3. 数据清洗 (强制转为 float32 并移除无效值)
        data = pd.to_numeric(data, errors='coerce')
        data = data[~np.isnan(data)].astype(np.float32)

        if len(data) < 5: 
            return {"error": f"有效数据点太少 (仅 {len(data)} 个)。"}

        # 4. 数据预处理 (补齐到 72000)
        target_len = 72000
        current_len = len(data)
        if current_len > target_len:
            data = data[:target_len]
        else:
            data = np.pad(data, (0, target_len - current_len), 'constant')
            
        # 5. 转换为 Tensor 并进行推理 (严格使用 Float32 并在 CPU 上)
        input_tensor = torch.tensor(data, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)
        
        with torch.no_grad():
            pred = htpe_model(input_tensor)
            
            # 【关键修改】回退到你最初最安全的取值方式
            k1_pred = pred[0, 0].item()
            k2_pred = pred[0, 1].item()
            
        return {
            "status": "success",
            "k1": round(k1_pred, 6),
            "k2": round(k2_pred, 6),
            "file_name": file.filename,
            "original_len": current_len
        }
        
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print("\n=== HTPE 推理报错 ===")
        print(err_msg)
        print("=====================\n")
        # 把具体的错误信息返回给前端，这样你能在网页上直接看到原因
        return {"error": f"推理失败: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🚀 服务器启动中...")
    print("="*50 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)