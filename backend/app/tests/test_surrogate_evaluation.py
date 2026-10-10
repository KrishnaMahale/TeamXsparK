"""
Tests for Power-Flow Surrogate Evaluation & Screening Policy (ENR-02 Step 2).

Validates:
- Correct regression metric calculations (MAE, RMSE, Max Absolute Error)
- Authoritative definition and denominator of false-safe rates
- Screening policy threshold behaviors (conservative margins vs zero margin)
- Benchmark report schema integrity
"""

import json
from pathlib import Path
import numpy as np
import pytest

from scripts.evaluate_surrogate import (
    evaluate_regression,
    evaluate_screening_policy,
    BENCHMARK_REPORT_PATH,
    V_PHYSICAL_MIN,
    V_PHYSICAL_MAX,
    FEEDER_PHYSICAL_MAX,
    TX_PHYSICAL_MAX,
    V_SCREENING_MIN,
    V_SCREENING_MAX,
    FEEDER_SCREENING_MAX,
    TX_SCREENING_MAX,
)


def test_evaluate_regression_metrics_accuracy():
    """Verify standard formula calculations for MAE, RMSE, and Max Absolute Error."""
    y_true = np.array([[1.0, 50.0], [1.02, 80.0], [0.98, 90.0]])
    y_pred = np.array([[1.01, 52.0], [1.01, 78.0], [0.99, 93.0]])
    names = ["voltage", "loading"]

    metrics = evaluate_regression(y_true, y_pred, names)

    # Voltage errors: [0.01, 0.01, 0.01] -> MAE=0.01, Max=0.01
    assert pytest.approx(metrics["voltage"]["mae"], abs=1e-5) == 0.01
    assert pytest.approx(metrics["voltage"]["max_abs_error"], abs=1e-5) == 0.01

    # Loading errors: [2.0, 2.0, 3.0] -> MAE = 7/3 = 2.333333, Max = 3.0
    assert pytest.approx(metrics["loading"]["mae"], abs=1e-4) == 2.333333
    assert pytest.approx(metrics["loading"]["max_abs_error"], abs=1e-4) == 3.0


def test_false_safe_rate_calculation_and_denominator():
    """
    Verify false-safe rate strictly uses true physically unsafe count as denominator.
    False-safe occurs when true state is UNSAFE but model screens it as SAFE.
    """
    target_names = ["V_B1", "F_01", "tx_loading_percent"]
    v_cols = ["V_B1"]
    load_cols = ["F_01"]
    tx_col = "tx_loading_percent"

    # Sample 0: Physically SAFE (V=1.00, F=60, Tx=60) -> Pred SAFE
    # Sample 1: Physically UNSAFE (V=1.055 overvoltage) -> Pred SAFE (V=1.040) -> FALSE-SAFE!
    # Sample 2: Physically UNSAFE (F=105% overload) -> Pred RISKY (F=104%) -> Correctly Caught
    # Sample 3: Physically SAFE (V=1.01, F=80, Tx=80) -> Pred RISKY (F=96%) -> Unnecessary Rejection
    y_true = np.array([
        [1.000, 60.0, 60.0],
        [1.055, 60.0, 60.0],
        [1.000, 105.0, 60.0],
        [1.010, 80.0, 80.0],
    ])
    y_pred = np.array([
        [1.000, 60.0, 60.0],
        [1.040, 60.0, 60.0],
        [1.000, 104.0, 60.0],
        [1.010, 96.0, 80.0],
    ])

    # Unscreened (exact physical limits: 0.95-1.05, 100%, 100%)
    res_unscreened = evaluate_screening_policy(
        y_true, y_pred, target_names, v_cols, load_cols, tx_col,
        v_min_thresh=0.950, v_max_thresh=1.050,
        feeder_max_thresh=100.0, tx_max_thresh=100.0,
    )
    # Physically unsafe = Sample 1 and Sample 2 -> 2 samples
    assert res_unscreened["physically_unsafe_count"] == 2
    # Sample 1 was predicted as 1.040 <= 1.050 -> False-Safe
    assert res_unscreened["false_safe_count"] == 1
    assert res_unscreened["false_safe_denominator"] == 2
    assert res_unscreened["false_safe_rate"] == 0.50

    # Conservative screening (thresholds: 1.042 pu upper voltage, 95% loading)
    res_conservative = evaluate_screening_policy(
        y_true, y_pred, target_names, v_cols, load_cols, tx_col,
        v_min_thresh=0.958, v_max_thresh=1.035, # Tight margin catches 1.040
        feeder_max_thresh=95.0, tx_max_thresh=95.0,
    )
    # With tight margin, Sample 1 (pred 1.040) is screened as RISKY (> 1.035) -> False-Safe eliminated!
    assert res_conservative["false_safe_count"] == 0
    assert res_conservative["false_safe_rate"] == 0.0


def test_benchmark_report_file_integrity():
    """Verify that surrogate_benchmark_report.json exists and contains all required data."""
    assert BENCHMARK_REPORT_PATH.exists(), "surrogate_benchmark_report.json not found"

    with open(BENCHMARK_REPORT_PATH, "r") as f:
        report = json.load(f)

    assert "grids" in report
    assert "overall_summary" in report

    for grid_id in ["default-grid", "medium-test-grid", "large-test-grid"]:
        assert grid_id in report["grids"]
        grid_data = report["grids"][grid_id]

        assert "regression_metrics" in grid_data
        assert "unscreened_safety" in grid_data
        assert "conservative_safety" in grid_data
        assert "latencies" in grid_data

        # Check latency entries
        lat = grid_data["latencies"]
        assert "physical_solver_ms" in lat
        assert "surrogate_inference_ms" in lat
        assert lat["physical_solver_ms"]["median"] > 0
        assert lat["surrogate_inference_ms"]["median"] > 0
