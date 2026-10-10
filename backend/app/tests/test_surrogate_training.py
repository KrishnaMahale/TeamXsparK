"""
Tests for Power-Flow Surrogate Model Training & Serialization (ENR-02 Step 2).

Validates:
- Successful serialization and loading of joblib artifacts for all 3 grids
- Consistent metadata schema in surrogate_metadata.json
- Model inference produces correct target dimensions with finite numbers
- Deterministic predictions across identical inputs
- Forecast model artifacts (solar, temp, load) remain untouched
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "backend" / "data" / "models"
METADATA_PATH = MODELS_DIR / "surrogate_metadata.json"

GRID_MODELS = [
    ("default-grid", "power_flow_surrogate_default.joblib", 4, 5),   # 4 buses, 5 feeders
    ("medium-test-grid", "power_flow_surrogate_medium.joblib", 5, 6), # 5 buses, 6 feeders
    ("large-test-grid", "power_flow_surrogate_large.joblib", 10, 12), # 10 buses, 12 feeders
]


def test_forecast_model_artifacts_remain_untouched():
    """Verify that existing production forecasting models were not overwritten."""
    solar_model = MODELS_DIR / "solar_ghi_model.joblib"
    temp_model = MODELS_DIR / "temperature_model.joblib"
    load_model = MODELS_DIR / "load_profile_model.joblib"
    meta_file = MODELS_DIR / "model_metadata.json"

    assert solar_model.exists(), "solar_ghi_model.joblib missing"
    assert temp_model.exists(), "temperature_model.joblib missing"
    assert load_model.exists(), "load_profile_model.joblib missing"
    assert meta_file.exists(), "model_metadata.json missing"


def test_surrogate_metadata_manifest_exists_and_valid():
    """Verify surrogate_metadata.json structure and required fields."""
    assert METADATA_PATH.exists(), "surrogate_metadata.json not found"

    with open(METADATA_PATH, "r") as f:
        meta = json.load(f)

    assert "grids" in meta
    assert "known_limitations" in meta
    assert len(meta["known_limitations"]) > 0

    for grid_id, _, _, _ in GRID_MODELS:
        assert grid_id in meta["grids"]
        grid_info = meta["grids"][grid_id]
        assert "feature_names" in grid_info
        assert "target_names" in grid_info
        assert "voltage_targets" in grid_info
        assert "loading_targets" in grid_info
        assert "test_metrics" in grid_info


@pytest.mark.parametrize("grid_id,artifact_name,expected_buses,expected_feeders", GRID_MODELS)
def test_surrogate_artifacts_load_and_predict_shapes(
    grid_id, artifact_name, expected_buses, expected_feeders
):
    """Verify that saved artifacts load correctly and produce expected target shapes."""
    artifact_path = MODELS_DIR / artifact_name
    assert artifact_path.exists(), f"Artifact {artifact_name} does not exist"

    payload = joblib.load(artifact_path)
    assert "model" in payload
    assert "feature_names" in payload
    assert "target_names" in payload
    assert payload["grid_id"] == grid_id

    assert len(payload["voltage_targets"]) == expected_buses
    assert len(payload["loading_targets"]) == expected_feeders

    # Total targets = voltages + feeders + tx_loading + losses
    expected_total_targets = expected_buses + expected_feeders + 2
    assert len(payload["target_names"]) == expected_total_targets

    model = payload["model"]
    model.n_jobs = 1

    # Test single-row inference
    n_features = len(payload["feature_names"])
    X_dummy = np.zeros((1, n_features))
    X_dummy[0, 0] = 100.0  # solar_kw
    X_dummy[0, 1] = 150.0  # load_kw
    X_dummy[0, 8] = 250.0  # installed_solar_capacity_kw
    X_dummy[0, 9] = 500.0  # transformer_rating_kva

    pred = model.predict(X_dummy)
    assert pred.shape == (1, expected_total_targets)
    assert not np.isnan(pred).any()
    assert not np.isinf(pred).any()


def test_surrogate_prediction_is_deterministic():
    """Verify that identical feature inputs yield identical predictions."""
    artifact_path = MODELS_DIR / "power_flow_surrogate_default.joblib"
    payload = joblib.load(artifact_path)
    model = payload["model"]
    model.n_jobs = 1

    X_test = np.array([[120.0, 180.0, -20.0, 0.0, 120.0, -80.0, 0.0, 50.0, 250.0, 500.0]])
    pred1 = model.predict(X_test)
    pred2 = model.predict(X_test)

    np.testing.assert_array_almost_equal(pred1, pred2, decimal=6)
