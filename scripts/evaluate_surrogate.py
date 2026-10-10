"""
Evaluation and Benchmarking Script for Power-Flow ML Surrogate Models.

Evaluates trained surrogate models against the physical solver on held-out test
partitions and near-limit stress test subsets.
Calculates:
- Per-target regression errors (MAE, RMSE, Max Absolute Error)
- False-safe rates with explicit denominators
- Near-limit boundary behavior
- Execution latencies (median and p95 for physical solver vs surrogate inference)

Outputs machine-readable benchmark report:
  backend/data/models/surrogate_benchmark_report.json
"""

from __future__ import annotations

import copy
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.power_flow import PowerFlowEngine

FEATURES_DIR = PROJECT_ROOT / "backend" / "data" / "features"
MODELS_DIR = PROJECT_ROOT / "backend" / "data" / "models"
BENCHMARK_REPORT_PATH = MODELS_DIR / "surrogate_benchmark_report.json"

GRID_CONFIGS = [
    {
        "grid_id": "default-grid",
        "csv_name": "surrogate_dataset_default_grid.csv",
        "model_file": "power_flow_surrogate_default.joblib",
    },
    {
        "grid_id": "medium-test-grid",
        "csv_name": "surrogate_dataset_medium_test_grid.csv",
        "model_file": "power_flow_surrogate_medium.joblib",
    },
    {
        "grid_id": "large-test-grid",
        "csv_name": "surrogate_dataset_large_test_grid.csv",
        "model_file": "power_flow_surrogate_large.joblib",
    },
]

# Physical limits
V_PHYSICAL_MIN = 0.950
V_PHYSICAL_MAX = 1.050
FEEDER_PHYSICAL_MAX = 100.0
TX_PHYSICAL_MAX = 100.0

# Conservative screening thresholds for candidate evaluation
# Proposed in ENR-02 design: 1.042 pu upper voltage, 95% loading
V_SCREENING_MAX = 1.042
V_SCREENING_MIN = 0.958
FEEDER_SCREENING_MAX = 95.0
TX_SCREENING_MAX = 95.0


def evaluate_regression(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    target_names: List[str],
) -> Dict[str, Dict[str, float]]:
    results = {}
    for i, name in enumerate(target_names):
        true_col = y_true[:, i]
        pred_col = y_pred[:, i]
        mae = float(np.mean(np.abs(true_col - pred_col)))
        rmse = float(np.sqrt(np.mean((true_col - pred_col) ** 2)))
        max_ae = float(np.max(np.abs(true_col - pred_col)))
        results[name] = {
            "mae": round(mae, 6),
            "rmse": round(rmse, 6),
            "max_abs_error": round(max_ae, 6),
        }
    return results


def evaluate_screening_policy(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    target_names: List[str],
    v_cols: List[str],
    load_cols: List[str],
    tx_col: str,
    v_min_thresh: float,
    v_max_thresh: float,
    feeder_max_thresh: float,
    tx_max_thresh: float,
) -> Dict[str, Any]:
    """
    Evaluates whether screening predictions with given thresholds correctly classifies
    safe vs unsafe states.
    A state is Physically Unsafe if:
      - Any true bus voltage < 0.950 or > 1.050 pu
      - Any true feeder loading > 100%
      - True tx loading > 100%
    A state is Screened Safe by surrogate if:
      - All predicted bus voltages in [v_min_thresh, v_max_thresh]
      - All predicted feeder loadings <= feeder_max_thresh
      - Predicted tx loading <= tx_max_thresh
    """
    v_indices = [target_names.index(c) for c in v_cols]
    f_indices = [target_names.index(c) for c in load_cols]
    tx_idx = target_names.index(tx_col)

    n_samples = len(y_true)

    # Physical ground truth violation flags
    true_v = y_true[:, v_indices]
    true_f = y_true[:, f_indices]
    true_tx = y_true[:, tx_idx]

    true_v_viol = (true_v < V_PHYSICAL_MIN) | (true_v > V_PHYSICAL_MAX)
    true_f_viol = true_f > FEEDER_PHYSICAL_MAX
    true_tx_viol = true_tx > TX_PHYSICAL_MAX

    true_unsafe = np.any(true_v_viol, axis=1) | np.any(true_f_viol, axis=1) | true_tx_viol
    true_safe = ~true_unsafe

    # Surrogate screening decision
    pred_v = y_pred[:, v_indices]
    pred_f = y_pred[:, f_indices]
    pred_tx = y_pred[:, tx_idx]

    pred_v_viol = np.any((pred_v < v_min_thresh) | (pred_v > v_max_thresh), axis=1)
    pred_f_viol = np.any(pred_f > feeder_max_thresh, axis=1)
    pred_tx_viol = pred_tx > tx_max_thresh
    screened_risky = pred_v_viol | pred_f_viol | pred_tx_viol
    screened_safe = ~screened_risky

    # Classification counts
    # Condition Positive = Physically Safe; Condition Negative = Physically Unsafe
    # Or in safety terms:
    # False-Safe (CRITICAL): Screened Safe BUT Physically Unsafe
    false_safe_mask = screened_safe & true_unsafe
    false_safe_count = int(np.sum(false_safe_mask))
    true_unsafe_count = int(np.sum(true_unsafe))
    true_safe_count = int(np.sum(true_safe))

    false_safe_rate = (
        float(false_safe_count / true_unsafe_count) if true_unsafe_count > 0 else 0.0
    )

    # False alarm (unnecessary rejection): Screened Risky BUT Physically Safe
    unnecessary_rejections = int(np.sum(screened_risky & true_safe))
    unnecessary_rejection_rate = (
        float(unnecessary_rejections / true_safe_count) if true_safe_count > 0 else 0.0
    )

    # Correct safety classifications
    correct_safe = int(np.sum(screened_safe & true_safe))
    correct_risky = int(np.sum(screened_risky & true_unsafe))

    # Precision & Recall treating 'Safe' as target class
    safe_precision = (
        float(correct_safe / np.sum(screened_safe)) if np.sum(screened_safe) > 0 else 0.0
    )
    safe_recall = float(correct_safe / true_safe_count) if true_safe_count > 0 else 0.0

    return {
        "thresholds_applied": {
            "voltage_range_pu": [v_min_thresh, v_max_thresh],
            "feeder_max_percent": feeder_max_thresh,
            "tx_max_percent": tx_max_thresh,
        },
        "total_test_samples": n_samples,
        "physically_safe_count": true_safe_count,
        "physically_unsafe_count": true_unsafe_count,
        "screened_safe_count": int(np.sum(screened_safe)),
        "screened_risky_count": int(np.sum(screened_risky)),
        "false_safe_count": false_safe_count,
        "false_safe_denominator": true_unsafe_count,
        "false_safe_rate": round(false_safe_rate, 6),
        "unnecessary_rejections_count": unnecessary_rejections,
        "unnecessary_rejection_rate": round(unnecessary_rejection_rate, 6),
        "safe_precision": round(safe_precision, 6),
        "safe_recall": round(safe_recall, 6),
    }


def benchmark_latencies(grid_id: str, artifact_payload: Any, X_single: np.ndarray, n_reps: int = 500) -> Dict[str, Any]:
    """
    Measures latency for:
    1. Physical solver PowerFlowEngine.solve() with grid deepcopy.
    2. Surrogate model inference.
    3. Surrogate inference + screening decision checks.
    """
    from app.db.repositories.network_repository import (
        initialize_default_grid,
        initialize_medium_grid,
        initialize_large_grid,
    )
    init_map = {
        "default-grid": initialize_default_grid,
        "medium-test-grid": initialize_medium_grid,
        "large-test-grid": initialize_large_grid,
    }
    grid = init_map[grid_id]()

    model = artifact_payload["model"]
    model.n_jobs = 1  # Sequential execution eliminates process-spawning IPC overhead for single-sample inference

    # 1. Physical solver benchmark
    engine = PowerFlowEngine()
    solver_times = []
    # Warm-up
    for _ in range(20):
        grid_copy = copy.deepcopy(grid)
        engine.solve(grid=grid_copy, solar_kw=100.0, load_kw=150.0)

    for _ in range(n_reps):
        t0 = time.perf_counter()
        grid_copy = copy.deepcopy(grid)
        engine.solve(grid=grid_copy, solar_kw=100.0, load_kw=150.0)
        solver_times.append((time.perf_counter() - t0) * 1000.0)

    # 2. Surrogate raw inference benchmark
    surrogate_times = []
    # Warm-up
    for _ in range(20):
        model.predict(X_single)

    for _ in range(n_reps):
        t0 = time.perf_counter()
        model.predict(X_single)
        surrogate_times.append((time.perf_counter() - t0) * 1000.0)

    # 3. Surrogate + screening overhead
    screening_times = []
    for _ in range(n_reps):
        t0 = time.perf_counter()
        pred = model.predict(X_single)
        _ = (
            np.any(pred[:, : len(artifact_payload["voltage_targets"])] < V_SCREENING_MIN)
            or np.any(pred[:, : len(artifact_payload["voltage_targets"])] > V_SCREENING_MAX)
            or np.any(pred[:, len(artifact_payload["voltage_targets"]) :] > FEEDER_SCREENING_MAX)
        )
        screening_times.append((time.perf_counter() - t0) * 1000.0)

    return {
        "repetitions": n_reps,
        "physical_solver_ms": {
            "median": round(float(np.median(solver_times)), 4),
            "p95": round(float(np.percentile(solver_times, 95)), 4),
            "p99": round(float(np.percentile(solver_times, 99)), 4),
            "mean": round(float(np.mean(solver_times)), 4),
        },
        "surrogate_inference_ms": {
            "median": round(float(np.median(surrogate_times)), 4),
            "p95": round(float(np.percentile(surrogate_times, 95)), 4),
            "p99": round(float(np.percentile(surrogate_times, 99)), 4),
            "mean": round(float(np.mean(surrogate_times)), 4),
        },
        "surrogate_plus_screening_ms": {
            "median": round(float(np.median(screening_times)), 4),
            "p95": round(float(np.percentile(screening_times, 95)), 4),
            "p99": round(float(np.percentile(screening_times, 99)), 4),
            "mean": round(float(np.mean(screening_times)), 4),
        },
        "speedup_ratio_median": round(
            float(np.median(solver_times) / max(np.median(surrogate_times), 1e-4)), 2
        ),
    }


def evaluate_all_grids() -> Dict[str, Any]:
    print("=" * 70)
    print("ENR-02 STEP 2 — POWER-FLOW SURROGATE EVALUATION & BENCHMARK")
    print("=" * 70)

    results: Dict[str, Any] = {
        "evaluation_timestamp": datetime.now().isoformat(),
        "grids": {},
        "overall_summary": {},
    }

    total_test_samples = 0
    total_unsafe_samples = 0
    total_conservative_false_safe = 0
    total_unscreened_false_safe = 0

    for grid_cfg in GRID_CONFIGS:
        grid_id = grid_cfg["grid_id"]
        csv_path = FEATURES_DIR / grid_cfg["csv_name"]
        model_path = MODELS_DIR / grid_cfg["model_file"]

        print(f"\n>>> Evaluating {grid_id}...")
        df = pd.read_csv(csv_path)
        payload = joblib.load(model_path)
        model = payload["model"]
        model.n_jobs = 1  # In-process single-thread inference avoids loky multiprocessing hang on Windows
        feature_cols = payload["feature_names"]
        target_cols = payload["target_names"]
        v_cols = payload["voltage_targets"]
        load_cols = payload["loading_targets"]
        tx_col = "tx_loading_percent"

        test_df = df[df["split_set"] == "test"].copy()
        near_limit_df = test_df[test_df["is_near_limit"] == 1].copy()

        X_test = test_df[feature_cols].values
        y_test = test_df[target_cols].values

        # Predictions
        y_pred = model.predict(X_test)

        # Regression Metrics
        reg_metrics = evaluate_regression(y_test, y_pred, target_cols)

        # Voltage & Feeder summaries
        v_maes = [reg_metrics[c]["mae"] for c in v_cols]
        v_rmses = [reg_metrics[c]["rmse"] for c in v_cols]
        v_max_ae = max(reg_metrics[c]["max_abs_error"] for c in v_cols)

        f_maes = [reg_metrics[c]["mae"] for c in load_cols]
        f_rmses = [reg_metrics[c]["rmse"] for c in load_cols]
        f_max_ae = max(reg_metrics[c]["max_abs_error"] for c in load_cols)

        tx_mae = reg_metrics[tx_col]["mae"]
        tx_rmse = reg_metrics[tx_col]["rmse"]
        tx_max_ae = reg_metrics[tx_col]["max_abs_error"]

        loss_mae = reg_metrics["total_loss_kw"]["mae"]

        # Safety evaluation: (1) Unscreened baseline (0 margin)
        unscreened_safety = evaluate_screening_policy(
            y_test,
            y_pred,
            target_cols,
            v_cols,
            load_cols,
            tx_col,
            v_min_thresh=V_PHYSICAL_MIN,
            v_max_thresh=V_PHYSICAL_MAX,
            feeder_max_thresh=FEEDER_PHYSICAL_MAX,
            tx_max_thresh=TX_PHYSICAL_MAX,
        )

        # Safety evaluation: (2) Conservative Screening Margin
        conservative_safety = evaluate_screening_policy(
            y_test,
            y_pred,
            target_cols,
            v_cols,
            load_cols,
            tx_col,
            v_min_thresh=V_SCREENING_MIN,
            v_max_thresh=V_SCREENING_MAX,
            feeder_max_thresh=FEEDER_SCREENING_MAX,
            tx_max_thresh=TX_SCREENING_MAX,
        )

        # Near-limit safety evaluation
        near_limit_safety = None
        if len(near_limit_df) > 0:
            X_near = near_limit_df[feature_cols].values
            y_near = near_limit_df[target_cols].values
            y_near_pred = model.predict(X_near)
            near_limit_safety = evaluate_screening_policy(
                y_near,
                y_near_pred,
                target_cols,
                v_cols,
                load_cols,
                tx_col,
                v_min_thresh=V_SCREENING_MIN,
                v_max_thresh=V_SCREENING_MAX,
                feeder_max_thresh=FEEDER_SCREENING_MAX,
                tx_max_thresh=TX_SCREENING_MAX,
            )

        # Latency Benchmark
        latency_results = benchmark_latencies(
            grid_id,
            payload,
            X_test[0:1, :],
            n_reps=100,
        )

        grid_eval = {
            "grid_id": grid_id,
            "test_sample_count": len(test_df),
            "near_limit_sample_count": len(near_limit_df),
            "regression_metrics": {
                "voltage": {
                    "mae_pu_mean": round(float(np.mean(v_maes)), 6),
                    "rmse_pu_mean": round(float(np.mean(v_rmses)), 6),
                    "max_abs_error_pu": round(float(v_max_ae), 6),
                    "per_bus": {c: reg_metrics[c] for c in v_cols},
                },
                "feeder_loading": {
                    "mae_percent_mean": round(float(np.mean(f_maes)), 4),
                    "rmse_percent_mean": round(float(np.mean(f_rmses)), 4),
                    "max_abs_error_percent": round(float(f_max_ae), 4),
                    "per_feeder": {c: reg_metrics[c] for c in load_cols},
                },
                "transformer_loading": {
                    "mae_percent": tx_mae,
                    "rmse_percent": tx_rmse,
                    "max_abs_error_percent": tx_max_ae,
                },
                "total_losses_kw": {
                    "mae_kw": loss_mae,
                    "rmse_kw": reg_metrics["total_loss_kw"]["rmse"],
                    "max_abs_error_kw": reg_metrics["total_loss_kw"]["max_abs_error"],
                },
            },
            "unscreened_safety": unscreened_safety,
            "conservative_safety": conservative_safety,
            "near_limit_conservative_safety": near_limit_safety,
            "latencies": latency_results,
        }

        results["grids"][grid_id] = grid_eval

        total_test_samples += len(test_df)
        total_unsafe_samples += conservative_safety["physically_unsafe_count"]
        total_conservative_false_safe += conservative_safety["false_safe_count"]
        total_unscreened_false_safe += unscreened_safety["false_safe_count"]

        # Print summary for grid
        print(f"  Voltage MAE: {np.mean(v_maes):.6f} pu | Max AE: {v_max_ae:.6f} pu")
        print(f"  Feeder Loading MAE: {np.mean(f_maes):.3f}% | Max AE: {f_max_ae:.3f}%")
        print(f"  Tx Loading MAE: {tx_mae:.3f}% | Max AE: {tx_max_ae:.3f}%")
        print(f"  Unscreened False-Safe Cases: {unscreened_safety['false_safe_count']} / {unscreened_safety['physically_unsafe_count']} ({unscreened_safety['false_safe_rate'] * 100:.2f}%)")
        print(f"  Conservative False-Safe Cases: {conservative_safety['false_safe_count']} / {conservative_safety['physically_unsafe_count']} ({conservative_safety['false_safe_rate'] * 100:.2f}%)")
        if near_limit_safety:
            print(f"  Near-Limit False-Safe Cases: {near_limit_safety['false_safe_count']} / {near_limit_safety['physically_unsafe_count']} ({near_limit_safety['false_safe_rate'] * 100:.2f}%)")
        print(f"  Latency: Solver={latency_results['physical_solver_ms']['median']} ms | Surrogate={latency_results['surrogate_inference_ms']['median']} ms")

    # Overall summary
    overall_conservative_fs_rate = (
        float(total_conservative_false_safe / total_unsafe_samples)
        if total_unsafe_samples > 0
        else 0.0
    )
    overall_unscreened_fs_rate = (
        float(total_unscreened_false_safe / total_unsafe_samples)
        if total_unsafe_samples > 0
        else 0.0
    )

    results["overall_summary"] = {
        "total_test_samples": total_test_samples,
        "total_physically_unsafe_samples": total_unsafe_samples,
        "unscreened_false_safe_count": total_unscreened_false_safe,
        "unscreened_false_safe_rate": round(overall_unscreened_fs_rate, 6),
        "conservative_false_safe_count": total_conservative_false_safe,
        "conservative_false_safe_rate": round(overall_conservative_fs_rate, 6),
        "policy_protection_benefit": f"Reduced false-safe cases from {total_unscreened_false_safe} ({overall_unscreened_fs_rate * 100:.2f}%) to {total_conservative_false_safe} ({overall_conservative_fs_rate * 100:.2f}%)",
    }

    with open(BENCHMARK_REPORT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 70)
    print("OVERALL SUMMARY ACROSS ALL 3 GRIDS:")
    print(f"Total Test Samples: {total_test_samples}")
    print(f"Total Physically Unsafe Samples: {total_unsafe_samples}")
    print(f"Unscreened (Zero-Margin) False-Safe Rate: {overall_unscreened_fs_rate * 100:.2f}% ({total_unscreened_false_safe} / {total_unsafe_samples})")
    print(f"Conservative Screening False-Safe Rate: {overall_conservative_fs_rate * 100:.2f}% ({total_conservative_false_safe} / {total_unsafe_samples})")
    print(f"Detailed benchmark written to: {BENCHMARK_REPORT_PATH}")
    print("=" * 70)

    return results


if __name__ == "__main__":
    evaluate_all_grids()
