import asyncio
import csv
import math
import os
import re
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
MODEL_PATH = os.path.join(os.path.dirname(__file__), "assets/PANORAMA_PROJECT-master/assets/models/best.pt")
model = None
if YOLO is not None:
    print(f"正在加载 YOLO 模型: {MODEL_PATH} ...")
    try:
        model = YOLO(MODEL_PATH)
        print("YOLO 模型加载成功！")
    except Exception as e:
        print(f"YOLO 模型加载失败: {e}")

# ==========================================
# 2. HTPE 模板匹配模型初始化
# ==========================================
HTPE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "assets/HTPE/best_model_cpu300.pt")

import torch.nn.functional as F

class _RMSNorm(torch.nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.scale = torch.nn.Parameter(torch.ones(dim))
    def forward(self, x):
        return x / (x.pow(2).mean(-1, keepdim=True) + 1e-6).sqrt() * self.scale

class _Attn(torch.nn.Module):
    def __init__(self, dim=256, heads=8):
        super().__init__()
        self.h, self.d = heads, dim // heads
        self.qkv_proj = torch.nn.Linear(dim, 3 * dim, bias=False)
        self.o_proj = torch.nn.Linear(dim, dim, bias=False)
    def forward(self, x):
        B, L, D = x.shape
        qkv = self.qkv_proj(x).reshape(B, L, 3, self.h, self.d).permute(2, 0, 3, 1, 4)
        q, k, v = qkv.unbind(0)
        out = F.scaled_dot_product_attention(q, k, v)
        return self.o_proj(out.transpose(1, 2).reshape(B, L, D))

class _FFN(torch.nn.Module):
    def __init__(self, dim=256, hid=665):
        super().__init__()
        self.gate_up = torch.nn.Linear(dim, 2 * hid, bias=False)
        self.down = torch.nn.Linear(hid, dim, bias=False)
    def forward(self, x):
        g, u = self.gate_up(x).chunk(2, -1)
        return self.down(F.silu(g) * u)

class _Block(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.norm1, self.attn = _RMSNorm(256), _Attn()
        self.norm2, self.ffn = _RMSNorm(256), _FFN()
    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.ffn(self.norm2(x))
        return x

class HTPEModel(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = torch.nn.Sequential(
            torch.nn.Conv1d(1, 32, 7), torch.nn.BatchNorm1d(32), torch.nn.ReLU(),
            torch.nn.Conv1d(32, 64, 7), torch.nn.BatchNorm1d(64), torch.nn.ReLU(),
            torch.nn.Conv1d(64, 256, 7), torch.nn.BatchNorm1d(256), torch.nn.ReLU(),
        )
        self.layers = torch.nn.ModuleList([_Block() for _ in range(4)])
        self.pool_attn = torch.nn.Sequential(
            torch.nn.Linear(256, 128), torch.nn.Tanh(), torch.nn.Linear(128, 1)
        )
        self.final_norm = _RMSNorm(256)
        self.head = torch.nn.Sequential(
            torch.nn.Linear(256, 256, bias=False), torch.nn.GELU(), torch.nn.Linear(256, 2, bias=False)
        )
    def forward(self, x):  # x: [B, L, 1]
        x = self.backbone(x.transpose(1, 2)).transpose(1, 2)  # [B, L', 256]
        for layer in self.layers:
            x = layer(x)
        x = self.final_norm(x)
        w = self.pool_attn(x).softmax(1)
        x = (x * w).sum(1)
        return self.head(x)

htpe_model = None
try:
    htpe_model = HTPEModel()
    htpe_model.load_state_dict(torch.load(HTPE_MODEL_PATH, map_location="cpu", weights_only=False))
    htpe_model.eval()
    print("HTPE 模型加载成功！")
except Exception as e:
    print(f"HTPE 模型加载失败: {e}")

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

        # 智能查找角度列（参考 predict.py）
        angle_candidates = ["anglerad", "thetarad", "theta", "angle", "angledeg", "value"]
        norm = lambda s: re.sub(r"[^a-z0-9]+", "", s.strip().lower())
        col_map = {norm(c): c for c in df.columns}
        angle_col = next((col_map[k] for k in angle_candidates if k in col_map), None)
        if angle_col is None:
            angle_col = "Angle_rad" if "Angle_rad" in df.columns else df.columns[-1]
        data = pd.to_numeric(df[angle_col], errors='coerce').to_numpy(np.float32)
        data_clean = data[np.isfinite(data)]

        if len(data_clean) < 5:
            return {"error": "有效数据点太少"}

        # 若有时间列，重采样到 200Hz
        time_candidates = {"time", "t", "sec", "seconds", "timestamp"}
        time_col = next((c for c in df.columns if norm(c) in time_candidates), None)
        target_len = 36000
        if time_col is not None:
            t = pd.to_numeric(df[time_col], errors='coerce').to_numpy(np.float64)
            mask = np.isfinite(t) & np.isfinite(data)
            t, data_clean = t[mask], data[mask]
            target_t = t[0] + np.arange(target_len) * 0.005
            data_clean = np.interp(target_t, t, data_clean).astype(np.float32)
        else:
            n = len(data_clean)
            if n >= target_len:
                data_clean = data_clean[:target_len]
            else:
                data_clean = np.pad(data_clean, (0, target_len - n), 'edge')

        input_tensor = torch.tensor(data_clean, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)

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

            # 3. RK4 动力学积分：预测未来 1000 帧
            g, L, m_pend, fps = 9.81, 1.0, 0.033, 200
            dt_sec = 1.0 / fps
            curr_theta = theta_last
            curr_v = v_last * fps  # rad/帧 → rad/s

            def deriv(th, v):
                a = (-(k1_pred / m_pend) * v
                     - (k2_pred * L / m_pend) * abs(v) * v
                     - (g / L) * math.sin(th))
                return v, a

            for _ in range(1000):
                v1, a1 = deriv(curr_theta, curr_v)
                v2, a2 = deriv(curr_theta + 0.5*dt_sec*v1, curr_v + 0.5*dt_sec*a1)
                v3, a3 = deriv(curr_theta + 0.5*dt_sec*v2, curr_v + 0.5*dt_sec*a2)
                v4, a4 = deriv(curr_theta + dt_sec*v3,     curr_v + dt_sec*a3)
                curr_theta += dt_sec * (v1 + 2*v2 + 2*v3 + v4) / 6
                curr_v     += dt_sec * (a1 + 2*a2 + 2*a3 + a4) / 6
                predicted_sequence.append(round(curr_theta, 6))
                
        except Exception as e:
            print(f"短时仿真生成失败: {e}")
            
        return {
            "status": "success",
            "k1": round(k1_pred, 6),
            "k2": round(k2_pred, 6),
            "file_name": file.filename,
            "original_len": len(data_clean),
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
