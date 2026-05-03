from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
import yaml


REPO_ROOT = Path(__file__).resolve().parent
PANORAMA_ROOT = REPO_ROOT / "assets" / "PANORAMA_PROJECT-master"
DEFAULT_CHART_POINTS = 1200


def _import_panorama_modules() -> tuple[Any, Any, Any]:
    sys.path.insert(0, str(PANORAMA_ROOT))
    from src.models import PANORAMA  # type: ignore
    from src.utils import calculate_rmse_numpy, get_theta_omega, get_time_axis  # type: ignore

    return PANORAMA, calculate_rmse_numpy, (get_theta_omega, get_time_axis)


def _resolve_asset_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PANORAMA_ROOT / path


def _to_float(value: float) -> float:
    rounded = round(float(value), 6)
    return 0.0 if rounded == 0 else rounded


def _format_metric(value: float, unit: str) -> str:
    return f"{value:.6f} {unit}"


def _make_metrics(rmse_pano: float, rmse_phys: float, horizon_seconds: float, unit: str, baseline_enabled: bool) -> list[dict[str, str]]:
    metrics = [{"label": "PANORAMA RMSE", "value": _format_metric(rmse_pano, unit), "note": "实时后端推理"}]

    if baseline_enabled:
        improvement = (rmse_phys - rmse_pano) / rmse_phys * 100 if rmse_phys else 0.0
        metrics.extend(
            [
                {"label": "物理基线 RMSE", "value": _format_metric(rmse_phys, unit), "note": "同一测试窗口"},
                {"label": "误差改善", "value": f"{improvement:+.2f}%", "note": "相对纯物理模型"},
            ]
        )
    else:
        metrics.append({"label": "基线对照", "value": "已关闭", "note": "本次运行仅显示 PANORAMA 预测"})

    metrics.append({"label": "外推窗口", "value": f"{horizon_seconds:.0f} s", "note": "测试段滚动预测"})
    return metrics


def _make_rows(
    series: list[dict[str, Any]],
    unit: str,
    baseline_enabled: bool,
    actual_key: str,
    physics_key: str,
    panorama_key: str,
) -> list[dict[str, str]]:
    if len(series) < 4:
        selected = series
    else:
        selected = [series[0], series[len(series) // 3], series[(len(series) * 2) // 3], series[-1]]

    rows = []
    for point in selected:
        rows.append(
            {
                "time": f"{point['second']:.2f} s",
                "actual": f"{point[actual_key]:.4f} {unit}",
                "physics": f"{point[physics_key]:.4f} {unit}" if baseline_enabled else "未启用",
                "panorama": f"{point[panorama_key]:.4f} {unit}",
                "note": "实时 PANORAMA 评估切片" if baseline_enabled else "未启用物理基线对照",
            }
        )
    return rows


@lru_cache(maxsize=1)
def _load_config() -> dict[str, Any]:
    config_path = PANORAMA_ROOT / "configs" / "train_config.yaml"
    with config_path.open("r", encoding="utf-8") as file:
        return yaml.safe_load(file)


@lru_cache(maxsize=1)
def _load_data() -> tuple[pd.DataFrame, np.ndarray, np.ndarray, np.ndarray]:
    _, _, utils = _import_panorama_modules()
    get_theta_omega, get_time_axis = utils
    config = _load_config()
    fps = float(config["system"]["fps"])
    dt = 1.0 / fps
    data_path = _resolve_asset_path(config["data"]["active_dataset"])

    if not data_path.exists():
        raise FileNotFoundError(data_path)

    df = pd.read_csv(data_path)
    theta, omega = get_theta_omega(df, fallback_dt=dt)
    time_axis = get_time_axis(df, fallback_dt=dt)
    return df, theta, omega, time_axis


def _infer_hidden_dim(state_dict: dict[str, torch.Tensor]) -> int:
    weight = state_dict.get("augmentation.net.0.weight")
    if weight is None:
        raise KeyError("Cannot infer hidden_dim from checkpoint: augmentation.net.0.weight missing")
    return int(weight.shape[0])


def _resolve_device(configured_device: str) -> torch.device:
    if configured_device == "cuda" and not torch.cuda.is_available():
        return torch.device("cpu")
    return torch.device(configured_device)


@lru_cache(maxsize=1)
def _load_models() -> tuple[Any, Any, dict[str, Any], int]:
    PANORAMA, _, _ = _import_panorama_modules()
    config = _load_config()
    device = _resolve_device(config["system"]["device"])
    fps = float(config["system"]["fps"])
    dt = 1.0 / fps
    model_path = _resolve_asset_path(config["paths"]["model_save"])

    if not model_path.exists():
        raise FileNotFoundError(model_path)

    checkpoint = torch.load(model_path, map_location=device, weights_only=True)
    hidden_dim = _infer_hidden_dim(checkpoint)
    model_kwargs = {
        "dt": dt,
        "g": config["physics"]["g"],
        "m": config["physics"]["m"],
        "L": config["physics"]["L"],
        "k1": config["physics"]["k1"],
        "k2": config["physics"]["k2"],
        "hidden_dim": hidden_dim,
        "input_scale": config["model"]["input_scale"],
    }

    physics_model = PANORAMA(**model_kwargs, residual_scale=0.0, output_init_std=0.0).to(device)
    physics_model.eval()

    panorama_model = PANORAMA(
        **model_kwargs,
        residual_scale=config["model"].get("residual_scale", 1.0),
        output_init_std=config["model"].get("output_init_std", 1e-3),
    ).to(device)
    panorama_model.load_state_dict(checkpoint)
    panorama_model.eval()

    return physics_model, panorama_model, {"device": device, "model_path": model_path}, hidden_dim


def run_panorama_forecast(job_id: str, request: dict[str, Any]) -> dict[str, Any]:
    config = _load_config()
    _, calculate_rmse_numpy, _ = _import_panorama_modules()
    _, theta, omega, time_axis = _load_data()
    physics_model, panorama_model, model_runtime, hidden_dim = _load_models()

    fps = float(config["system"]["fps"])
    train_ratio = float(request.get("trainRatio", config["data"].get("train_ratio", 0.75)))
    horizon_seconds = float(request.get("horizonSeconds", 60))
    target_variable = request.get("targetVariable", "theta")
    baseline_enabled = bool(request.get("baselineEnabled", True))

    start_idx = int(len(theta) * train_ratio)
    horizon_steps = max(1, int(round(horizon_seconds * fps)))
    available_steps = len(theta) - (start_idx + 1)
    actual_len = min(horizon_steps, available_steps)

    device = model_runtime["device"]
    init_state = torch.tensor([[theta[start_idx], omega[start_idx]]], dtype=torch.float32).to(device)
    true_theta = theta[start_idx + 1 : start_idx + 1 + actual_len]
    true_omega = omega[start_idx + 1 : start_idx + 1 + actual_len]

    with torch.no_grad():
        physics_traj, _ = physics_model(init_state, actual_len)
        panorama_traj, _ = panorama_model(init_state, actual_len)

    physics_np = physics_traj.cpu().numpy().squeeze()
    panorama_np = panorama_traj.cpu().numpy().squeeze()
    relative_time = time_axis[start_idx + 1 : start_idx + 1 + actual_len] - time_axis[start_idx + 1]
    downsample_every = max(1, math.floor(actual_len / DEFAULT_CHART_POINTS))

    series = []
    for index in range(0, actual_len, downsample_every):
        series.append(
            {
                "second": _to_float(relative_time[index]),
                "actual": _to_float(true_theta[index]),
                "actualOmega": _to_float(true_omega[index]),
                "physics": _to_float(physics_np[index, 0]) if baseline_enabled else None,
                "physicsOmega": _to_float(physics_np[index, 1]) if baseline_enabled else None,
                "panorama": _to_float(panorama_np[index, 0]),
                "panoramaOmega": _to_float(panorama_np[index, 1]),
                "phase": "test",
            }
        )

    if series[-1]["second"] != _to_float(relative_time[-1]):
        index = actual_len - 1
        series.append(
            {
                "second": _to_float(relative_time[index]),
                "actual": _to_float(true_theta[index]),
                "actualOmega": _to_float(true_omega[index]),
                "physics": _to_float(physics_np[index, 0]) if baseline_enabled else None,
                "physicsOmega": _to_float(physics_np[index, 1]) if baseline_enabled else None,
                "panorama": _to_float(panorama_np[index, 0]),
                "panoramaOmega": _to_float(panorama_np[index, 1]),
                "phase": "test",
            }
        )

    theta_rmse_phys = calculate_rmse_numpy(physics_np[:, 0], true_theta)
    theta_rmse_pano = calculate_rmse_numpy(panorama_np[:, 0], true_theta)
    omega_rmse_phys = calculate_rmse_numpy(physics_np[:, 1], true_omega)
    omega_rmse_pano = calculate_rmse_numpy(panorama_np[:, 1], true_omega)

    if target_variable == "omega":
        metrics = _make_metrics(omega_rmse_pano, omega_rmse_phys, actual_len / fps, "rad/s", baseline_enabled)
        evaluation_rows = _make_rows(series, "rad/s", baseline_enabled, "actualOmega", "physicsOmega", "panoramaOmega")
        rmse_text = f"{omega_rmse_pano:.6f} rad/s"
        variable_name = "omega"
    else:
        metrics = _make_metrics(theta_rmse_pano, theta_rmse_phys, actual_len / fps, "rad", baseline_enabled)
        evaluation_rows = _make_rows(series, "rad", baseline_enabled, "actual", "physics", "panorama")
        rmse_text = f"{theta_rmse_pano:.6f} rad"
        variable_name = "theta"

    data_path = _resolve_asset_path(config["data"]["active_dataset"])
    return {
        "jobId": job_id,
        "targetVariable": target_variable,
        "baselineEnabled": baseline_enabled,
        "source": "panorama_realtime_backend",
        "generatedFrom": {
            "dataset": str(data_path.relative_to(REPO_ROOT)),
            "model": str(model_runtime["model_path"].relative_to(REPO_ROOT)),
            "trainRatio": train_ratio,
            "fps": fps,
            "horizonSeconds": round(actual_len / fps, 3),
            "hiddenDim": hidden_dim,
            "rawPoints": int(actual_len),
        },
        "series": series,
        "metrics": metrics,
        "evaluationRows": evaluation_rows,
        "conclusion": (
            f"该结果由后端实时加载 PANORAMA 权重和单摆数据生成。"
            f"{variable_name} 在 {actual_len / fps:.0f}s 测试窗口内的 PANORAMA RMSE 为 {rmse_text}。"
        ),
        "modelSummary": {
            "physicsTerm": "F_p：阻尼单摆动力学",
            "augmentationTerm": "F_a：后端实时加载 panorama_model.pth 的神经残差修正",
            "integrator": f"RK4，原始 {fps:.0f}fps 下滚动积分",
        },
    }
