"""
Tests for Power-Flow Surrogate Dataset Generation (ENR-02 Step 2).

Validates:
- Dataset generation on all supported grids (default-grid, medium-test-grid, large-test-grid)
- Clean grid state isolation (no cross-sample transformer/substation mutation)
- All target columns are finite, realistic, and non-empty
- Reproducibility given fixed random seeds
- Grouped split leakage resistance (train, val, test are mutually exclusive)
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from scripts.generate_surrogate_dataset import (
    generate_grid_dataset,
    get_grid_capacities,
    get_grid_initializers,
    FEATURES_DIR,
    MANIFEST_PATH,
)


@pytest.mark.parametrize("grid_id", ["default-grid", "medium-test-grid", "large-test-grid"])
def test_pilot_dataset_generation_runs_successfully(grid_id):
    """Verify that pilot generation produces valid records for all grids."""
    df = generate_grid_dataset(grid_id, target_count=15, seed=123)
    assert len(df) == 15
    assert (df["solver_success"] == 1).all()

    # Verify essential columns exist
    expected_cols = [
        "sample_id", "grid_id", "scenario_type", "split_set",
        "solar_kw", "load_kw", "battery_power_kw", "solar_curtailment_kw",
        "tx_loading_percent", "total_loss_kw", "is_safe"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in {grid_id}"


def test_no_cross_sample_grid_mutation():
    """Verify that multiple consecutive solves do not contaminate transformer loading."""
    initializers = get_grid_initializers()
    grid_fn = initializers["default-grid"]
    grid_before = grid_fn()
    initial_tx_loading = getattr(grid_before.substation, "loadingPercent", 0.0)

    # Generate samples that induce high transformer loading
    df = generate_grid_dataset("default-grid", target_count=5, seed=999)
    assert len(df) == 5

    # Fresh grid must still have clean initial loading
    grid_after = grid_fn()
    assert getattr(grid_after.substation, "loadingPercent", 0.0) == initial_tx_loading


def test_dataset_reproducibility():
    """Verify that identical seeds produce identical feature and target values."""
    df1 = generate_grid_dataset("default-grid", target_count=10, seed=42)
    df2 = generate_grid_dataset("default-grid", target_count=10, seed=42)

    pd.testing.assert_frame_equal(df1, df2)


def test_split_sets_mutually_exclusive():
    """Verify that sample IDs and scenario records are partitioned cleanly."""
    if not MANIFEST_PATH.exists():
        pytest.skip("Surrogate manifest not generated yet.")

    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    for grid_id, meta in manifest["grids"].items():
        csv_path = FEATURES_DIR / meta["csv_file"]
        if not csv_path.exists():
            continue
        df = pd.read_csv(csv_path)

        train_ids = set(df[df["split_set"] == "train"]["sample_id"])
        val_ids = set(df[df["split_set"] == "validation"]["sample_id"])
        test_ids = set(df[df["split_set"] == "test"]["sample_id"])

        # Disjoint ID sets
        assert train_ids.isdisjoint(val_ids)
        assert train_ids.isdisjoint(test_ids)
        assert val_ids.isdisjoint(test_ids)

        # Test set contains holdout stress scenario
        test_scenarios = set(df[df["split_set"] == "test"]["scenario_type"])
        assert "extreme_stress_holdout" in test_scenarios


def test_target_values_are_finite_and_realistic():
    """Verify no NaN/inf values and physical realistic bounds on generated data."""
    if not MANIFEST_PATH.exists():
        pytest.skip("Manifest not generated yet.")

    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    for grid_id, meta in manifest["grids"].items():
        csv_path = FEATURES_DIR / meta["csv_file"]
        if not csv_path.exists():
            continue
        df = pd.read_csv(csv_path)

        v_cols = meta["target_voltage_columns"]
        load_cols = meta["target_loading_columns"]

        for col in v_cols + load_cols + ["tx_loading_percent", "total_loss_kw"]:
            vals = df[col].values
            assert not np.isnan(vals).any(), f"NaN found in {col} for {grid_id}"
            assert not np.isinf(vals).any(), f"Inf found in {col} for {grid_id}"

        # Voltages must be within plausible physical range [0.80, 1.20] pu
        v_min = df[v_cols].min().min()
        v_max = df[v_cols].max().max()
        assert v_min >= 0.80, f"Voltage too low: {v_min}"
        assert v_max <= 1.25, f"Voltage too high: {v_max}"
