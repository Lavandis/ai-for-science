#!/usr/bin/env python3
"""Generate a frontend fixture from the bundled PANORAMA project assets."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
PANORAMA_ROOT = REPO_ROOT / "assets" / "PANORAMA_PROJECT-master"
DEFAULT_OUTPUT = REPO_ROOT / "src" / "features" / "timeSeriesForecast" / "panoramaForecastResult.json"


def import_panorama_modules() -> tuple[Any, Any, Any]:
    sys.path.insert(0, str(PANORAMA_ROOT))
    from src.models import PANORAMA  # type: ignore
    from src.utils import calculate_rmse_numpy, get_theta_omega  # type: ignore

    return PANORAMA, calculate_rmse_numpy, get_theta_omega


def load_config() -> dict[str, Any]:
    config_path = PANORAMA_ROOT / "configs" / "train_config.yaml"
    with config_path.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    config["system"]["device"] = "cpu"
    config["data"]["active_dataset"] = "data/processed/pendulum_data_updated.csv"
    config["paths"]["model_save"] = "assets/models/panorama_model.pth"
    return config


def resolve_asset_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PANORAMA_ROOT / path


def to_float(value: float) -> float:
    rounded = round(float(value), 6)
    if rounded == 0:
        return 0.0
    return rounded


def make_series(
    time_axis: np.ndarray,
    true_theta: np.ndarray,
    true_omega: np.ndarray,
    physics_traj: np.ndarray,
    panorama_traj: np.ndarray,
    downsample_every: int,
) -> list[dict[str, Any]]:
    series: list[dict[str, Any]] = []

    for index in range(0, len(true_theta), downsample_every):
      series.append(
          {
              "second": to_float(time_axis[index]),
              "actual": to_float(true_theta[index]),
              "actualOmega": to_float(true_omega[index]),
              "physics": to_float(physics_traj[index, 0]),
              "physicsOmega": to_float(physics_traj[index, 1]),
              "panorama": to_float(panorama_traj[index, 0]),
              "panoramaOmega": to_float(panorama_traj[index, 1]),
              "phase": "test",
          }
      )

    if series[-1]["second"] != to_float(time_axis[-1]):
        index = len(true_theta) - 1
        series.append(
            {
                "second": to_float(time_axis[index]),
                "actual": to_float(true_theta[index]),
                "actualOmega": to_float(true_omega[index]),
                "physics": to_float(physics_traj[index, 0]),
                "physicsOmega": to_float(physics_traj[index, 1]),
                "panorama": to_float(panorama_traj[index, 0]),
                "panoramaOmega": to_float(panorama_traj[index, 1]),
                "phase": "test",
            }
        )

    return series


def make_metrics(
    rmse_pano: float,
    rmse_phys: float,
    horizon_seconds: float,
    unit: str,
) -> list[dict[str, str]]:
    improvement = (rmse_phys - rmse_pano) / rmse_phys * 100 if rmse_phys else 0.0

    return [
        {"label": "PANORAMA RMSE", "value": f"{rmse_pano:.6f} {unit}", "note": "真实模型评估"},
        {"label": "物理基线 RMSE", "value": f"{rmse_phys:.6f} {unit}", "note": "同一测试窗口"},
        {"label": "误差改善", "value": f"{improvement:+.2f}%", "note": "相对纯物理模型"},
        {"label": "外推窗口", "value": f"{horizon_seconds:.0f} s", "note": "测试段滚动预测"},
    ]


def make_rows(
    series: list[dict[str, Any]],
    unit: str,
    actual_key: str = "actual",
    physics_key: str = "physics",
    panorama_key: str = "panorama",
) -> list[dict[str, str]]:
    if len(series) < 4:
        selected = series
    else:
        selected = [series[0], series[len(series) // 3], series[(len(series) * 2) // 3], series[-1]]

    return [
        {
            "time": f"{point['second']:.2f} s",
            "actual": f"{point[actual_key]:.4f} {unit}",
            "physics": f"{point[physics_key]:.4f} {unit}",
            "panorama": f"{point[panorama_key]:.4f} {unit}",
            "note": "真实 PANORAMA 评估切片",
        }
        for point in selected
    ]


def infer_hidden_dim(state_dict: dict[str, torch.Tensor]) -> int:
    weight = state_dict.get("augmentation.net.0.weight")
    if weight is None:
        raise KeyError("Cannot infer hidden_dim from checkpoint: augmentation.net.0.weight missing")
    return int(weight.shape[0])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--horizon-seconds", type=float, default=60.0)
    parser.add_argument("--chart-points", type=int, default=180)
    args = parser.parse_args()

    PANORAMA, calculate_rmse_numpy, get_theta_omega = import_panorama_modules()
    config = load_config()
    fps = float(config["system"]["fps"])
    dt = 1.0 / fps
    horizon_steps = max(1, int(round(args.horizon_seconds * fps)))

    data_path = resolve_asset_path(config["data"]["active_dataset"])
    model_path = resolve_asset_path(config["paths"]["model_save"])
    if not data_path.exists():
        raise FileNotFoundError(data_path)
    if not model_path.exists():
        raise FileNotFoundError(model_path)

    df = pd.read_csv(data_path)
    theta, omega = get_theta_omega(df, fallback_dt=dt)
    train_ratio = float(config["data"].get("train_ratio", 0.75))
    start_idx = int(len(theta) * train_ratio)
    available_steps = len(theta) - (start_idx + 1)
    actual_len = min(horizon_steps, available_steps)

    init_state = torch.tensor([[theta[start_idx], omega[start_idx]]], dtype=torch.float32)
    true_theta = theta[start_idx + 1 : start_idx + 1 + actual_len]
    true_omega = omega[start_idx + 1 : start_idx + 1 + actual_len]

    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    hidden_dim = infer_hidden_dim(checkpoint)

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

    physics_model = PANORAMA(**model_kwargs, residual_scale=0.0, output_init_std=0.0)
    physics_model.eval()
    with torch.no_grad():
        physics_traj, _ = physics_model(init_state, actual_len)

    panorama_model = PANORAMA(
        **model_kwargs,
        residual_scale=config["model"].get("residual_scale", 1.0),
        output_init_std=config["model"].get("output_init_std", 1e-3),
    )
    panorama_model.load_state_dict(checkpoint)
    panorama_model.eval()
    with torch.no_grad():
        panorama_traj, _ = panorama_model(init_state, actual_len)

    physics_np = physics_traj.cpu().numpy().squeeze()
    panorama_np = panorama_traj.cpu().numpy().squeeze()

    theta_rmse_phys = calculate_rmse_numpy(physics_np[:, 0], true_theta)
    theta_rmse_pano = calculate_rmse_numpy(panorama_np[:, 0], true_theta)
    theta_improvement = (theta_rmse_phys - theta_rmse_pano) / theta_rmse_phys * 100 if theta_rmse_phys else 0.0
    omega_rmse_phys = calculate_rmse_numpy(physics_np[:, 1], true_omega)
    omega_rmse_pano = calculate_rmse_numpy(panorama_np[:, 1], true_omega)
    omega_improvement = (omega_rmse_phys - omega_rmse_pano) / omega_rmse_phys * 100 if omega_rmse_phys else 0.0

    time_axis = df["Time"].to_numpy(dtype="float32")[start_idx + 1 : start_idx + 1 + actual_len]
    time_axis = time_axis - time_axis[0]
    downsample_every = max(1, math.floor(actual_len / args.chart_points))
    series = make_series(time_axis, true_theta, true_omega, physics_np, panorama_np, downsample_every)

    fixture = {
        "source": "panorama_project_assets",
        "generatedFrom": {
            "dataset": str(data_path.relative_to(REPO_ROOT)),
            "model": str(model_path.relative_to(REPO_ROOT)),
            "trainRatio": train_ratio,
            "fps": fps,
            "horizonSeconds": round(actual_len / fps, 3),
            "hiddenDim": hidden_dim,
            "rawPoints": int(actual_len),
        },
        "targetVariable": "theta",
        "baselineEnabled": True,
        "series": series,
        "metrics": make_metrics(theta_rmse_pano, theta_rmse_phys, actual_len / fps, "rad"),
        "evaluationRows": make_rows(series, "rad"),
        "variableSummaries": {
            "theta": {
                "unit": "rad",
                "metrics": make_metrics(theta_rmse_pano, theta_rmse_phys, actual_len / fps, "rad"),
                "evaluationRows": make_rows(series, "rad"),
                "conclusion": (
                    f"PANORAMA 在 {actual_len / fps:.0f}s 测试窗口内的 theta RMSE 为 {theta_rmse_pano:.6f} rad，"
                    f"相对纯物理基线改善 {theta_improvement:+.2f}%。"
                ),
            },
            "omega": {
                "unit": "rad/s",
                "metrics": make_metrics(omega_rmse_pano, omega_rmse_phys, actual_len / fps, "rad/s"),
                "evaluationRows": make_rows(series, "rad/s", "actualOmega", "physicsOmega", "panoramaOmega"),
                "conclusion": (
                    f"PANORAMA 在 {actual_len / fps:.0f}s 测试窗口内的 omega RMSE 为 {omega_rmse_pano:.6f} rad/s，"
                    f"相对纯物理基线改善 {omega_improvement:+.2f}%。"
                ),
            },
        },
        "conclusion": (
            f"该结果由 assets/PANORAMA_PROJECT-master 中的真实模型权重和单摆数据生成。"
            f"PANORAMA 在 {actual_len / fps:.0f}s 测试窗口内的 theta RMSE 为 {theta_rmse_pano:.6f} rad，"
            f"相对纯物理基线改善 {theta_improvement:+.2f}%。"
        ),
        "modelSummary": {
            "physicsTerm": "F_p：阻尼单摆动力学",
            "augmentationTerm": "F_a：已加载 panorama_model.pth 的神经残差修正",
            "integrator": f"RK4，原始 {fps:.0f}fps 下滚动积分",
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output.relative_to(REPO_ROOT)} with {len(series)} chart points.")


if __name__ == "__main__":
    main()
