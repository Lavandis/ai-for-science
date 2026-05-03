import os
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import torch
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.models import PANORAMA
from src.utils import calculate_rmse_numpy, get_theta_omega, get_time_axis


def resolve_project_path(path_value):
    path = Path(path_value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_config(config_path=None):
    config_path = Path(config_path) if config_path else PROJECT_ROOT / "configs" / "train_config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_device(configured_device):
    if configured_device == "cuda" and not torch.cuda.is_available():
        print("CUDA is not available. Falling back to CPU.")
        return torch.device("cpu")
    return torch.device(configured_device)


def infer_hidden_dim(state_dict):
    weight = state_dict.get("augmentation.net.0.weight")
    if weight is None:
        return None
    return int(weight.shape[0])


def main():
    config = load_config()
    device = resolve_device(config["system"]["device"])
    fps = config["system"]["fps"]
    dt = 1.0 / fps

    print("Start PANORAMA evaluation...")

    data_path = resolve_project_path(config["data"]["active_dataset"])
    if not data_path.exists():
        raise FileNotFoundError(f"Cannot find dataset: {data_path}")

    df = pd.read_csv(data_path)
    theta, omega = get_theta_omega(df, fallback_dt=dt)

    train_ratio = config["data"].get("train_ratio", 0.75)
    start_idx = int(len(theta) * train_ratio)
    actual_len = len(theta) - (start_idx + 1)

    print(f"Test start index: {start_idx}")
    print(f"Test rollout length: {actual_len} steps")
    print(f"Evaluation sampling: full-resolution @ {fps} fps")

    theta_0 = theta[start_idx]
    omega_0 = omega[start_idx]
    init_state = torch.tensor([[theta_0, omega_0]], dtype=torch.float32).to(device)
    true_future = theta[start_idx + 1 : start_idx + 1 + actual_len]

    model_path = resolve_project_path(config["paths"]["model_save"])
    if not model_path.exists():
        raise FileNotFoundError(
            f"Cannot find trained model: {model_path}\nRun scripts/03_train.py first."
        )

    state_dict = torch.load(model_path, map_location=device, weights_only=True)
    hidden_dim = infer_hidden_dim(state_dict) or config["model"]["hidden_dim"]

    model = PANORAMA(
        dt=dt,
        g=config["physics"]["g"],
        m=config["physics"]["m"],
        L=config["physics"]["L"],
        k1=config["physics"]["k1"],
        k2=config["physics"]["k2"],
        hidden_dim=hidden_dim,
        input_scale=config["model"]["input_scale"],
        residual_scale=config["model"].get("residual_scale", 1.0),
        output_init_std=config["model"].get("output_init_std", 1e-3),
    ).to(device)

    pure_physics_model = PANORAMA(
        dt=dt,
        g=config["physics"]["g"],
        m=config["physics"]["m"],
        L=config["physics"]["L"],
        k1=config["physics"]["k1"],
        k2=config["physics"]["k2"],
        hidden_dim=hidden_dim,
        input_scale=config["model"]["input_scale"],
        residual_scale=0.0,
        output_init_std=0.0,
    ).to(device)
    pure_physics_model.eval()

    with torch.no_grad():
        phys_pred_traj, _ = pure_physics_model(init_state, actual_len)
        phys_pred = phys_pred_traj.cpu().numpy().squeeze()[:, 0]

    model.load_state_dict(state_dict)
    model.eval()
    with torch.no_grad():
        pano_pred_traj, _ = model(init_state, actual_len)
        pano_pred = pano_pred_traj.cpu().numpy().squeeze()[:, 0]

    rmse_phys = calculate_rmse_numpy(phys_pred, true_future)
    rmse_pano = calculate_rmse_numpy(pano_pred, true_future)
    improvement = (rmse_phys - rmse_pano) / rmse_phys * 100

    print("\nEvaluation results (RMSE):")
    print(f"  Physics baseline | RMSE: {rmse_phys:.6f} rad")
    print(f"  PANORAMA         | RMSE: {rmse_pano:.6f} rad")
    print(f"  Improvement      | {improvement:+.2f}%")

    time_axis = get_time_axis(df, fallback_dt=dt)[start_idx + 1 : start_idx + 1 + actual_len]
    time_axis = time_axis - time_axis[0]

    plt.figure(figsize=(14, 6), dpi=150)
    plt.plot(time_axis, true_future, color="#2ca02c", linewidth=2, alpha=0.7, label="Ground Truth")
    plt.plot(
        time_axis,
        phys_pred,
        color="#1f77b4",
        linestyle="--",
        linewidth=1.5,
        alpha=0.8,
        label=f"Physics (RMSE: {rmse_phys:.4f})",
    )
    plt.plot(
        time_axis,
        pano_pred,
        color="#d62728",
        linewidth=1.5,
        label=f"PANORAMA (RMSE: {rmse_pano:.4f})",
    )

    plt.title(
        f"PANORAMA Long-Horizon Prediction\nImprovement: {improvement:.2f}%",
        fontsize=14,
        fontweight="bold",
    )
    plt.xlabel("Time (Seconds)", fontsize=12)
    plt.ylabel("Angle (Radian)", fontsize=12)
    plt.legend(loc="upper right", fontsize=11)
    plt.grid(True, linestyle=":", alpha=0.6)

    plot_save_path = resolve_project_path(config["paths"]["plot_save"])
    os.makedirs(plot_save_path.parent, exist_ok=True)
    plt.savefig(plot_save_path, bbox_inches="tight")
    print(f"Saved plot to: {plot_save_path.resolve()}")

    if os.environ.get("DISPLAY") and "agg" not in plt.get_backend().lower():
        plt.show()
    else:
        plt.close()


if __name__ == "__main__":
    main()
