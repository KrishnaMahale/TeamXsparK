"""
Train Power-Flow Surrogate Models for Renewable Distribution Grids.

Trains per-grid multi-output regression models (HistGradientBoostingRegressor)
to learn the physical PowerFlowEngine.solve() behavior across voltage and
equipment loading targets.

Preserves existing solar, temperature, and load forecasting models untouched.
Saves model artifacts to backend/data/models/power_flow_surrogate_*.joblib
and metadata to backend/data/models/surrogate_metadata.json.
"""

from __future__ import annotations

import json
import os
import platform
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
FEATURES_DIR = PROJECT_ROOT / "backend" / "data" / "features"
MODELS_DIR = PROJECT_ROOT / "backend" / "data" / "models"
MANIFEST_PATH = FEATURES_DIR / "surrogate_dataset_manifest.json"

GRID_CONFIGS = [
    {
        "grid_id": "default-grid",
        "csv_name": "surrogate_dataset_default_grid.csv",
        "artifact_name": "power_flow_surrogate_default.joblib",
    },
    {
        "grid_id": "medium-test-grid",
        "csv_name": "surrogate_dataset_medium_test_grid.csv",
        "artifact_name": "power_flow_surrogate_medium.joblib",
    },
    {
        "grid_id": "large-test-grid",
        "csv_name": "surrogate_dataset_large_test_grid.csv",
        "artifact_name": "power_flow_surrogate_large.joblib",
    },
]


def load_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Surrogate dataset not found: {csv_path}")
    return pd.read_csv(csv_path)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, target_names: List[str]) -> Dict[str, Dict[str, float]]:
    metrics: Dict[str, Dict[str, float]] = {}
    for i, name in enumerate(target_names):
        true_col = y_true[:, i]
        pred_col = y_pred[:, i]
        mae = float(np.mean(np.abs(true_col - pred_col)))
        rmse = float(np.sqrt(np.mean((true_col - pred_col) ** 2)))
        max_ae = float(np.max(np.abs(true_col - pred_col)))
        
        # Calculate R-squared if variance > 0
        ss_tot = float(np.sum((true_col - np.mean(true_col)) ** 2))
        ss_res = float(np.sum((true_col - pred_col) ** 2))
        r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 1e-9 else 1.0

        metrics[name] = {
            "mae": round(mae, 6),
            "rmse": round(rmse, 6),
            "max_abs_error": round(max_ae, 6),
            "r2": round(r2, 6),
        }
    return metrics


def train_grid_surrogate(
    grid_cfg: Dict[str, str],
    manifest_data: Dict[str, Any],
) -> Tuple[Any, Dict[str, Any]]:
    grid_id = grid_cfg["grid_id"]
    csv_path = FEATURES_DIR / grid_cfg["csv_name"]
    print(f"\n=======================================================")
    print(f"Training Surrogate for {grid_id}")
    print(f"=======================================================")
    
    df = load_dataset(csv_path)
    grid_meta = manifest_data["grids"][grid_id]
    feature_cols = grid_meta["feature_columns"]
    v_cols = grid_meta["target_voltage_columns"]
    load_cols = grid_meta["target_loading_columns"]
    
    target_cols = v_cols + load_cols + ["tx_loading_percent", "total_loss_kw"]
    
    train_df = df[df["split_set"] == "train"]
    val_df = df[df["split_set"] == "validation"]
    test_df = df[df["split_set"] == "test"]
    near_limit_test_df = test_df[test_df["is_near_limit"] == 1]

    print(f"Dataset partition counts: train={len(train_df)}, val={len(val_df)}, test={len(test_df)} (near-limit test={len(near_limit_test_df)})")

    X_train = train_df[feature_cols].values
    y_train = train_df[target_cols].values

    X_val = val_df[feature_cols].values
    y_val = val_df[target_cols].values

    X_test = test_df[feature_cols].values
    y_test = test_df[target_cols].values

    # Estimator: MultiOutputRegressor wrapping HistGradientBoostingRegressor
    # Fast, handles non-linearities and interactions naturally
    base_estimator = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        min_samples_leaf=20,
        l2_regularization=0.1,
        random_state=42,
    )
    model = MultiOutputRegressor(base_estimator, n_jobs=-1)

    t0 = time.time()
    model.fit(X_train, y_train)
    fit_time = time.time() - t0
    print(f"Fit completed in {fit_time:.2f}s for {len(target_cols)} targets.")

    # Evaluate on val and test
    y_val_pred = model.predict(X_val)
    y_test_pred = model.predict(X_test)

    val_metrics = compute_metrics(y_val, y_val_pred, target_cols)
    test_metrics = compute_metrics(y_test, y_test_pred, target_cols)

    # Near-limit metrics
    near_limit_metrics: Dict[str, Dict[str, float]] = {}
    if len(near_limit_test_df) > 0:
        X_near = near_limit_test_df[feature_cols].values
        y_near = near_limit_test_df[target_cols].values
        y_near_pred = model.predict(X_near)
        near_limit_metrics = compute_metrics(y_near, y_near_pred, target_cols)

    # Summarize voltage and feeder aggregates
    v_test_maes = [test_metrics[c]["mae"] for c in v_cols]
    f_test_maes = [test_metrics[c]["mae"] for c in load_cols]
    v_test_max = max(test_metrics[c]["max_abs_error"] for c in v_cols)
    f_test_max = max(test_metrics[c]["max_abs_error"] for c in load_cols)

    print(f"Test Voltage MAE: {np.mean(v_test_maes):.6f} pu | Max AE: {v_test_max:.6f} pu")
    print(f"Test Feeder Loading MAE: {np.mean(f_test_maes):.3f}% | Max AE: {f_test_max:.3f}%")
    print(f"Test Tx Loading MAE: {test_metrics['tx_loading_percent']['mae']:.3f}% | Max AE: {test_metrics['tx_loading_percent']['max_abs_error']:.3f}%")

    model_metadata = {
        "grid_id": grid_id,
        "artifact_file": grid_cfg["artifact_name"],
        "model_type": "MultiOutputRegressor(HistGradientBoostingRegressor)",
        "hyperparameters": {
            "max_iter": 150,
            "learning_rate": 0.08,
            "max_leaf_nodes": 31,
            "min_samples_leaf": 20,
            "l2_regularization": 0.1,
            "random_state": 42,
        },
        "feature_names": feature_cols,
        "target_names": target_cols,
        "voltage_targets": v_cols,
        "loading_targets": load_cols,
        "transformer_target": "tx_loading_percent",
        "losses_target": "total_loss_kw",
        "sample_counts": {
            "total": len(df),
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
            "test_near_limit": len(near_limit_test_df),
        },
        "training_time_seconds": round(fit_time, 3),
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
        "near_limit_test_metrics": near_limit_metrics,
        "aggregate_test_summary": {
            "voltage_mae_pu_mean": round(float(np.mean(v_test_maes)), 6),
            "voltage_max_abs_error_pu": round(float(v_test_max), 6),
            "feeder_loading_mae_percent_mean": round(float(np.mean(f_test_maes)), 4),
            "feeder_loading_max_abs_error_percent": round(float(f_test_max), 4),
            "tx_loading_mae_percent": test_metrics["tx_loading_percent"]["mae"],
            "tx_loading_max_abs_error_percent": test_metrics["tx_loading_percent"]["max_abs_error"],
        },
    }

    # Set n_jobs = 1 for lightweight serialized inference without loky multiprocessing overhead
    model.n_jobs = 1

    # Bundle model artifact with internal schema dictionary for bulletproof standalone loading
    artifact_payload = {
        "model": model,
        "feature_names": feature_cols,
        "target_names": target_cols,
        "voltage_targets": v_cols,
        "loading_targets": load_cols,
        "grid_id": grid_id,
        "trained_at": datetime.now().isoformat(),
        "sklearn_version": sklearn.__version__,
    }

    artifact_path = MODELS_DIR / grid_cfg["artifact_name"]
    joblib.dump(artifact_payload, artifact_path, compress=3)
    print(f"Saved artifact to {artifact_path} ({os.path.getsize(artifact_path) / 1024:.1f} KB)")

    return artifact_payload, model_metadata


def run_training_pipeline() -> Dict[str, Any]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}. Run scripts/generate_surrogate_dataset.py first.")

    with open(MANIFEST_PATH, "r") as f:
        manifest_data = json.load(f)

    all_metadata: Dict[str, Any] = {
        "pipeline_version": "1.0.0",
        "created_at": datetime.now().isoformat(),
        "python_version": platform.python_version(),
        "sklearn_version": sklearn.__version__,
        "dataset_seed": manifest_data.get("seed", 42),
        "dataset_generated_at": manifest_data.get("generated_at"),
        "grids": {},
        "known_limitations": [
            "Surrogate provides instantaneous electrical estimates, not sequential battery degradation.",
            "Surrogate is restricted to supported single/alternative radial topologies evaluated during training.",
            "Surrogate cannot guarantee 100% false-safe screening without physical solver verification on borderline candidates.",
            "Uncalibrated or foreign feeder topologies outside default, medium, and large test definitions must fall back to PowerFlowEngine.solve().",
        ],
    }

    for grid_cfg in GRID_CONFIGS:
        _, meta = train_grid_surrogate(grid_cfg, manifest_data)
        all_metadata["grids"][grid_cfg["grid_id"]] = meta

    metadata_path = MODELS_DIR / "surrogate_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(all_metadata, f, indent=2)
    print(f"\nMetadata written to {metadata_path}")
    print("All power-flow surrogate models trained and saved successfully.")
    return all_metadata


if __name__ == "__main__":
    run_training_pipeline()
