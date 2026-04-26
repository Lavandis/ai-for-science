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
# 1. YOLO 视频跟踪模型初始化 (绝对路径)
# ==========================================
MODEL_PATH = r"D:\yolov12-main\best.pt" 
print(f"正在加载 YOLO 模型: {MODEL_PATH} ...")
try:
    model = YOLO(MODEL_PATH)
    print("YOLO 模型加载成功！")
except Exception as e:
    print(f"YOLO 模型加载失败: {e}")

# ==========================================
# 2. HTPE 模板匹配模型初始化 (绝对路径)
# ==========================================
HTPE_DIR = r"D:\Users\zp061\Desktop\HTPE"
HTPE_MODEL_PATH = r"D:\Users\zp061\Desktop\ai-for-science\src\best_model_cpu1.pt"

if HTPE_DIR not in sys.path:
    sys.path.append(HTPE_DIR)

htpe_model = None
try:
    from utils.functions import load_model_class
    from hydra import initialize_config_dir, compose
    from hydra.core.global_hydra import GlobalHydra
    
    print(f"正在加载 HTPE 模型配置和权重...")
    print(f"HTPE 目录: {HTPE_DIR}")
    print(f"模型权重: {HTPE_MODEL_PATH}")
    
    GlobalHydra.instance().clear()
    
    with initialize_config_dir(version_base=None, config_dir=os.path.join(HTPE_DIR, "conf")):
        cfg = compose(config_name="config")
        
    ModelClass = load_model_class(cfg.model.identifier)
    htpe_model = ModelClass(cfg.model)
    
    htpe_model.load_state_dict(torch.load(HTPE_MODEL_PATH, map_location=torch.device("cpu")))
    htpe_model.eval()
    print("HTPE 模型加载成功！")
except Exception as e:
    print(f"HTPE 模型加载失败 (请检查路径是否准确): {e}")
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

# --- HTPE 推理接口 ---
@app.post("/match-template")
async def match_template(file: UploadFile = File(...)):
    print(f"🔔 收到 HTPE 请求! 文件: {file.filename}")
    
    if htpe_model is None:
        return {"error": "HTPE模型未加载，请检查后端 Python 终端。"}
        
    try:
        df = pd.read_csv(file.file, encoding='utf-8-sig')
        if df.empty: return {"error": "CSV 是空的"}

        data = df.iloc[:, -1].values
        data = pd.to_numeric(data, errors='coerce')
        data_clean = data[~np.isnan(data)].astype(np.float32)

        if len(data_clean) < 5: 
            return {"error": f"有效数据点太少"}

        target_len = 72000
        current_len = len(data_clean)
        if current_len > target_len:
            data_padded = data_clean[:target_len]
        else:
            data_padded = np.pad(data_clean, (0, target_len - current_len), 'constant')
            
        input_tensor = torch.tensor(data_padded, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)
        
        with torch.no_grad():
            pred = htpe_model(input_tensor)
            k1_pred = pred[0, 0].item()
            k2_pred = pred[0, 1].item()

        # ==========================================
        # 🚀 核心新增：利用反演参数进行前向物理仿真预测
        # ==========================================
        predicted_sequence = []
        try:
            # 1. 强制设定步长为 1 (因为模型训练时使用的是基于帧的序列，k1 k2 是 per-frame 的)
            dt = 1.0
            
            # 2. 获取末端初始状态 (位置与速度)
            theta_last = float(data_clean[-1])
            
            # 【关键优化】为了防止实验数据的单点噪声导致初始速度爆炸，我们取最后 5 帧的平均速度
            if len(data_clean) >= 5:
                v_last = float(data_clean[-1] - data_clean[-5]) / 4.0
            else:
                v_last = float(data_clean[-1] - data_clean[-2])
            
            # 3. 动力学积分：预测未来 1000 帧
            curr_theta = theta_last
            curr_v = v_last
            for _ in range(1000):
                # 单摆微分方程: θ'' = -k1*θ' - k2*sin(θ)
                acc = -k1_pred * curr_v - k2_pred * math.sin(curr_theta)
                curr_v += acc * dt
                curr_theta += curr_v * dt
                predicted_sequence.append(round(curr_theta, 6))
                
        except Exception as e:
            print(f"短时仿真生成失败: {e}")
            
        return {
            "status": "success",
            "k1": round(k1_pred, 6),
            "k2": round(k2_pred, 6),
            "file_name": file.filename,
            "original_len": current_len,
            "predicted_sequence": predicted_sequence # 把预测数组传给前端
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"推理失败: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🚀 服务器启动中...")
    print("="*50 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)
