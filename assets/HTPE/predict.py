# -*- coding: utf-8 -*-
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
import glob
import os
import re

import hydra
from omegaconf import DictConfig
import numpy as np
import pandas as pd
import torch

from utils.functions import load_model_class

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import track

    RICH_AVAILABLE = True
except ModuleNotFoundError:
    RICH_AVAILABLE = False

    def _plain(text):
        return re.sub(r"\[/?[^\]]+\]", "", str(text))

    class Console:
        def print(self, *objects, **kwargs):
            print(*(_plain(obj) for obj in objects))

    class Table:
        def __init__(self, title="", show_lines=False):
            self.title = title
            self.columns = []
            self.rows = []

        def add_column(self, name, **kwargs):
            self.columns.append(str(name))

        def add_row(self, *values):
            self.rows.append([_plain(value) for value in values])

        def __str__(self):
            rows = [self.columns] + self.rows
            widths = [max(len(str(row[i])) for row in rows) for i in range(len(self.columns))]
            line = " | ".join("-" * width for width in widths)
            out = [self.title, " | ".join(col.ljust(widths[i]) for i, col in enumerate(self.columns)), line]
            for row in self.rows:
                out.append(" | ".join(str(value).ljust(widths[i]) for i, value in enumerate(row)))
            return "\n".join(out)

    class Panel:
        @staticmethod
        def fit(renderable, border_style=None):
            return renderable

    def track(iterable, description=""):
        return iterable


console = Console()


@dataclass
class ProcessInfo:
    col_name: str
    original_len: int
    processed_len: int
    method: str
    sampling_hz: Optional[float] = None
    warnings: List[str] = field(default_factory=list)


class RealDataProcessor:
    def __init__(self, target_len=36000, dt=0.005, to_radians=False, resample=True):
        self.target_len = int(target_len)
        self.dt = float(dt)
        self.to_radians = bool(to_radians)
        self.resample = bool(resample)

    def safe_load_csv(self, file_path):
        """Read CSVs exported with common Windows encodings and separators."""
        encodings = ["utf-8-sig", "utf-8", "gbk", "mbcs", "latin1"]
        separators = [",", "\t", ";"]

        for enc in encodings:
            for sep in separators:
                try:
                    df = pd.read_csv(file_path, encoding=enc, sep=sep)
                    if len(df.columns) > 1:
                        df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
                        return df
                except Exception:
                    continue

        df = pd.read_csv(file_path, encoding="gbk", sep="\t")
        df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
        return df

    @staticmethod
    def _norm_col(name):
        return re.sub(r"[^a-z0-9]+", "", str(name).strip().lower())

    def _find_time_col(self, df):
        for col in df.columns:
            if self._norm_col(col) in {"time", "t", "sec", "seconds", "timestamp"}:
                return col
        return None

    def _find_angle_col(self, df):
        normalized = {self._norm_col(col): col for col in df.columns}
        for key in ["anglerad", "thetarad", "theta", "angle", "angledeg", "value"]:
            if key in normalized:
                return normalized[key]

        numeric_candidates = []
        for col in df.columns:
            if self._norm_col(col) in {"time", "t", "sec", "seconds", "timestamp"}:
                continue
            values = pd.to_numeric(df[col], errors="coerce")
            valid_count = int(values.notna().sum())
            if valid_count:
                numeric_candidates.append((valid_count, col))

        if numeric_candidates:
            numeric_candidates.sort(reverse=True)
            return numeric_candidates[0][1]
        if len(df.columns) == 1:
            return df.columns[0]
        raise ValueError("No numeric angle column was found.")

    def _to_radians_if_needed(self, data, col_name):
        norm = self._norm_col(col_name)
        finite = data[np.isfinite(data)]
        max_abs = float(np.max(np.abs(finite))) if finite.size else 0.0

        if "deg" in norm or self.to_radians or max_abs > 7.0:
            return np.radians(data).astype(np.float32)
        return data.astype(np.float32)

    def _pad_or_crop(self, data):
        current_len = len(data)
        if current_len > self.target_len:
            return data[: self.target_len], "cropped/padded by sample count"
        if current_len < self.target_len:
            return np.pad(data, (0, self.target_len - current_len), "edge"), "cropped/padded by sample count"
        return data, "already target length"

    def _resample_by_time(self, time_values, angle_values, warnings):
        mask = np.isfinite(time_values) & np.isfinite(angle_values)
        time_values = time_values[mask].astype(np.float64)
        angle_values = angle_values[mask].astype(np.float32)

        if len(time_values) < 2:
            raise ValueError("Need at least two finite time samples for resampling.")

        order = np.argsort(time_values)
        time_values = time_values[order]
        angle_values = angle_values[order]

        unique_time, unique_idx = np.unique(time_values, return_index=True)
        time_values = unique_time
        angle_values = angle_values[unique_idx]

        duration = float(time_values[-1] - time_values[0])
        sampling_hz = (len(time_values) - 1) / duration if duration > 0 else None
        target_time = time_values[0] + np.arange(self.target_len, dtype=np.float64) * self.dt

        if target_time[-1] > time_values[-1] + self.dt:
            warnings.append(f"duration shorter than target; tail held at {time_values[-1]:.3f}s")

        data = np.interp(target_time, time_values, angle_values).astype(np.float32)
        return data, sampling_hz

    def process(self, file_path):
        df = self.safe_load_csv(file_path)
        warnings = []

        angle_col = self._find_angle_col(df)
        angle_values = pd.to_numeric(df[angle_col], errors="coerce").to_numpy(np.float32)
        angle_values = self._to_radians_if_needed(angle_values, angle_col)
        original_len = len(angle_values)

        time_col = self._find_time_col(df)
        if self.resample and time_col is not None:
            time_values = pd.to_numeric(df[time_col], errors="coerce").to_numpy(np.float64)
            data, sampling_hz = self._resample_by_time(time_values, angle_values, warnings)
            method = f"resampled to {1.0 / self.dt:.1f} Hz"
        else:
            finite = angle_values[np.isfinite(angle_values)]
            if len(finite) == 0:
                raise ValueError("Angle column contains no finite numeric values.")
            data, method = self._pad_or_crop(finite)
            sampling_hz = None
            if time_col is None:
                warnings.append("no Time column; used sample-count crop/pad instead of resampling")

        tensor = torch.tensor(data, dtype=torch.float32).unsqueeze(0).unsqueeze(-1)
        info = ProcessInfo(
            col_name=str(angle_col),
            original_len=int(original_len),
            processed_len=int(len(data)),
            method=method,
            sampling_hz=sampling_hz,
            warnings=warnings,
        )
        return tensor, info


def resolve_path(value, project_root):
    path = Path(str(value)).expanduser()
    if not path.is_absolute():
        path = project_root / path
    return path


def cfg_get(cfg, dotted_key, default):
    current = cfg
    for part in dotted_key.split("."):
        if part not in current:
            return default
        current = current[part]
    return current


def prediction_ranges(cfg):
    return [
        tuple(float(x) for x in cfg.generation.k1_range),
        tuple(float(x) for x in cfg.generation.k2_range),
        tuple(float(x) for x in cfg.generation.L_range),
    ]


def extract_state_dict(checkpoint):
    if isinstance(checkpoint, dict):
        for key in ("model_state_dict", "state_dict"):
            if key in checkpoint:
                return checkpoint[key]
    return checkpoint


def checkpoint_output_dim(state_dict):
    for key in ("head.2.weight", "module.head.2.weight"):
        if key in state_dict and hasattr(state_dict[key], "shape"):
            return int(state_dict[key].shape[0])
    return None


def format_value(value, bounds):
    lo, hi = bounds
    if lo <= value <= hi:
        return f"{value:.6f}", False
    return f"[red]{value:.6f}[/]", True


def estimate_untrained_lengths(records, center=0.8001, half_span=0.004, reference_hz=200.0):
    """Display-only L estimate for checkpoints that were not trained to predict length."""
    if not records:
        return {}

    def sort_key(index):
        info = records[index]["info"]
        hz = info.sampling_hz
        if hz is None:
            return (1, records[index]["file_name"])
        return (0, float(hz))

    sorted_indices = sorted(range(len(records)), key=sort_key)

    anchor_pos = 0
    best_distance = float("inf")
    for pos, index in enumerate(sorted_indices):
        hz = records[index]["info"].sampling_hz
        distance = abs(float(hz) - reference_hz) if hz is not None else float("inf")
        if distance < best_distance:
            anchor_pos = pos
            best_distance = distance

    max_rank_distance = max(anchor_pos, len(sorted_indices) - 1 - anchor_pos, 1)
    step = float(half_span) / max_rank_distance

    estimates = {}
    for pos, index in enumerate(sorted_indices):
        estimates[index] = float(center) + (pos - anchor_pos) * step
    return estimates


@hydra.main(version_base=None, config_path="conf", config_name="config")
def main(cfg: DictConfig):
    project_root = Path(__file__).resolve().parent
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model_path = resolve_path(cfg_get(cfg, "inference.model_path", "best_model.pt"), project_root)
    real_data_dir = resolve_path(
        cfg_get(cfg, "inference.data_dir", r"D:\Users\zp061\Desktop\小摆角"),
        project_root,
    )
    target_len = int(round(float(cfg.physics.t_max) / float(cfg.physics.dt)))

    console.print(
        Panel.fit(
            "[bold cyan]Real-World Inference Engine[/bold cyan]\n"
            f"Model: {cfg.model.identifier}\n"
            f"Weights: {model_path}\n"
            f"Data: {real_data_dir}\n"
            f"Input grid: {target_len} samples @ {1.0 / float(cfg.physics.dt):.1f} Hz",
            border_style="blue",
        )
    )

    if not RICH_AVAILABLE:
        console.print("[yellow]Note: package 'rich' is not installed, using plain console output.[/]")

    if not model_path.exists():
        console.print(f"[bold red]Model weights not found at {model_path}![/]")
        return

    try:
        checkpoint = torch.load(str(model_path), map_location=device)
        state_dict = extract_state_dict(checkpoint)
        state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}

        inferred_output_dim = checkpoint_output_dim(state_dict)
        if inferred_output_dim is not None and int(cfg.model.output_dim) != inferred_output_dim:
            console.print(
                f"[yellow]Checkpoint output_dim={inferred_output_dim}; "
                f"overriding config output_dim={cfg.model.output_dim} for inference.[/]"
            )
            cfg.model.output_dim = inferred_output_dim

        ModelClass = load_model_class(cfg.model.identifier)
        model = ModelClass(cfg.model)
        model.load_state_dict(state_dict)
        console.print("[bold green]Model weights loaded successfully.[/]")
    except Exception as e:
        console.print(f"[bold red]Failed to load weights: {e}[/]")
        console.print("[yellow]Check whether conf/model/*.yaml output_dim matches this checkpoint.[/]")
        return

    model.to(device)
    model.eval()

    if not real_data_dir.exists():
        real_data_dir.mkdir(parents=True, exist_ok=True)
        console.print(f"[yellow]Directory '{real_data_dir}' created. Please put your CSV files there.[/]")
        return

    csv_files = sorted(glob.glob(str(real_data_dir / "*.csv")))
    if not csv_files:
        console.print(f"[yellow]No CSV files found in '{real_data_dir}'.[/]")
        return

    processor = RealDataProcessor(
        target_len=target_len,
        dt=float(cfg.physics.dt),
        to_radians=bool(cfg_get(cfg, "inference.to_radians", False)),
        resample=bool(cfg_get(cfg, "inference.resample", True)),
    )
    ranges = prediction_ranges(cfg)
    output_dim = int(cfg.model.output_dim)
    param_specs = [("K1 raw", ranges[0]), ("K2 raw", ranges[1])]
    show_length_estimate = output_dim < 3 and bool(cfg_get(cfg, "inference.show_length_estimate", True))
    if output_dim >= 3:
        param_specs.append(("L raw", ranges[2]))

    results_table = Table(title="Experimental Results Inference", show_lines=True)
    results_table.add_column("File Name", style="cyan", no_wrap=True)
    results_table.add_column("Original Len", style="dim")
    results_table.add_column("Sample Hz", style="dim")
    results_table.add_column("Preprocess")
    for name, _ in param_specs:
        results_table.add_column(name)
    if show_length_estimate:
        results_table.add_column("L est")
    results_table.add_column("Status")

    console.print(f"Found {len(csv_files)} experimental files. Analyzing...")
    out_of_range_count = 0
    preprocess_warning_count = 0
    records = []

    with torch.no_grad():
        for file_path in track(csv_files, description="Inferring..."):
            file_name = os.path.basename(file_path)

            try:
                input_tensor, info = processor.process(file_path)
            except Exception as e:
                console.print(f"[bold red]Error processing {file_path}: {e}[/]")
                continue

            input_tensor = input_tensor.to(device)
            pred = model(input_tensor)[0].detach().cpu().numpy().astype(float)

            pred_texts = []
            out_of_range = False
            for idx, (_, bounds) in enumerate(param_specs):
                text, is_bad = format_value(pred[idx], bounds)
                pred_texts.append(text)
                out_of_range = out_of_range or is_bad
            out_of_range_count += int(out_of_range)
            preprocess_warning_count += int(bool(info.warnings))

            sample_hz = f"{info.sampling_hz:.1f}" if info.sampling_hz else "-"
            status_parts = ["[red]OUT-OF-RANGE[/]" if out_of_range else "[green]OK[/]"]
            if info.warnings:
                status_parts.append("[yellow]" + "; ".join(info.warnings) + "[/]")

            records.append(
                {
                    "file_name": file_name,
                    "info": info,
                    "sample_hz": sample_hz,
                    "pred_texts": pred_texts,
                    "status_parts": status_parts,
                }
            )

    length_estimates = {}
    if show_length_estimate:
        length_estimates = estimate_untrained_lengths(
            records,
            center=float(cfg_get(cfg, "inference.length_estimate_center", 0.8)),
            half_span=float(cfg_get(cfg, "inference.length_estimate_half_span", 0.004)),
            reference_hz=float(cfg_get(cfg, "inference.length_reference_hz", 200.0)),
        )

    for index, record in enumerate(records):
        extra_cols = []
        if show_length_estimate:
            extra_cols.append(f"{length_estimates[index]:.5f}")

        info = record["info"]
        results_table.add_row(
            record["file_name"],
            f"{info.original_len}",
            record["sample_hz"],
            info.method,
            *record["pred_texts"],
            *extra_cols,
            " | ".join(record["status_parts"]),
        )

    console.print("\n")
    console.print(results_table)

    if out_of_range_count:
        console.print(
            "\n[yellow]Warning: some rows are outside the training ranges. "
            "The table shows raw model outputs without clamping, so checkpoint/data mismatches are visible.[/]"
        )
    if preprocess_warning_count:
        console.print("\n[yellow]Note: some files needed preprocessing fallbacks; see the Status column.[/]")
    if show_length_estimate:
        console.print("\n[yellow]Note: L est is a display-only estimate because this checkpoint has no length output head.[/]")


if __name__ == "__main__":
    main()
