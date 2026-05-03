import asyncio
import csv
import math
import os
import sys
import tempfile
import threading
import traceback
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from panorama_forecast_service import run_panorama_forecast

try:
    import cv2
except Exception as e:
    cv2 = None
    print(f"OpenCV 加载失败，图像识别接口将不可用: {e}")

try:
    from ultralytics import YOLO
except Exception as e:
    YOLO = None
    print(f"Ultralytics 加载失败，图像识别接口将不可用: {e}")

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
model = None
if YOLO is not None:
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

# ==========================================
# 3. API 路由
# ==========================================

forecast_jobs = {}
forecast_results = {}
forecast_sequence = 0
forecast_lock = threading.Lock()


class ForecastJobRequest(BaseModel):
    datasetId: str
    modelId: str
    targetVariable: str = "theta"
    trainRatio: float = 0.75
    horizonSeconds: float = 60
    sampleRateFps: float = 200
    baselineEnabled: bool = True


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clone_job(job):
    return {**job, "request": {**job["request"]}}


def update_forecast_job(job_id, **updates):
    with forecast_lock:
        job = forecast_jobs.get(job_id)
        if job is None:
            return
        forecast_jobs[job_id] = {**job, **updates, "updatedAt": now_iso()}


def run_forecast_job(job_id, request):
    update_forecast_job(job_id, status="running", progress=58, message="正在执行 PANORAMA 实时滚动积分")
    try:
        result = run_panorama_forecast(job_id=job_id, request=request)
        with forecast_lock:
            forecast_results[job_id] = result
        update_forecast_job(job_id, status="completed", progress=100, message="预测完成")
    except Exception as e:
        traceback.print_exc()
        update_forecast_job(job_id, status="failed", progress=100, message=f"预测失败: {e}")


@app.get("/api/forecast/datasets")
async def list_forecast_datasets():
    return [
        {
            "id": "pendulum-200fps",
            "name": "PANORAMA 单摆实验真实数据",
            "sourcePath": "assets/PANORAMA_PROJECT-master/data/processed/pendulum_data_updated.csv",
            "sampleRateFps": 200,
            "durationSeconds": 240,
            "variables": ["theta", "omega"],
            "description": "来自 PANORAMA_PROJECT 的真实单摆 CSV，包含 theta 摆角和 omega 角速度。",
        }
    ]


@app.get("/api/forecast/models")
async def list_forecast_models():
    return [
        {
            "id": "panorama-v1",
            "name": "PANORAMA 混合动力学模型",
            "kind": "panorama",
            "version": "pth-realtime",
            "description": "后端实时加载 panorama_model.pth，执行物理白盒项加神经残差项的滚动积分。",
            "supportsBaselineComparison": True,
        }
    ]


@app.post("/api/forecast/jobs")
async def create_forecast_job(request: ForecastJobRequest):
    global forecast_sequence

    with forecast_lock:
        forecast_sequence += 1
        job_id = f"forecast-job-{forecast_sequence}"
        created_at = now_iso()
        job = {
            "id": job_id,
            "status": "queued",
            "createdAt": created_at,
            "updatedAt": created_at,
            "request": request.model_dump(),
            "progress": 12,
            "message": "预测任务已进入队列",
        }
        forecast_jobs[job_id] = job

    thread = threading.Thread(target=run_forecast_job, args=(job_id, request.model_dump()), daemon=True)
    thread.start()
    return clone_job(job)


@app.get("/api/forecast/jobs/{job_id}")
async def get_forecast_job(job_id: str):
    with forecast_lock:
        job = forecast_jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="预测任务不存在")
        return clone_job(job)


@app.get("/api/forecast/jobs/{job_id}/result")
async def get_forecast_result(job_id: str):
    with forecast_lock:
        job = forecast_jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="预测任务不存在")
        if job["status"] != "completed":
            raise HTTPException(status_code=409, detail="预测任务尚未完成")
        return forecast_results[job_id]

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
        if cv2 is None or model is None:
            await websocket.send_json({"error": "图像识别模型未加载，无法执行视频跟踪"})
            return

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
