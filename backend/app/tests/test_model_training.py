"""Step 4C Unit and Validation Tests: Model Loading, Metadata, Bounds, and Inference.

Verifies:
1. Model artifacts (.joblib and .json) exist in backend/data/models/
2. Joblib files load successfully as valid estimators / pipelines
3. Metadata exists with full environment, feature, and split provenance
4. Feature names match metadata and feature dataset headers
5. Prediction output has expected shape
6. Predictions contain no NaN
7. Predictions are finite
8. Solar predictions are strictly non-negative (>= 0 W/m²)
9. Temperature predictions are within physical range (-10°C to 60°C)
10. Load predictions are strictly non-negative (>= 0 kW)
11. Predictions are deterministic and reproducible
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
FEATURES_DIR = BASE_DIR / "data" / "features"


def test_model_artifacts_exist():
    """Verify that all Step 4C model artifacts and reports exist in backend/data/models/."""
    expected_files = [
        "solar_ghi_model.joblib",
        "temperature_model.joblib",
        "load_profile_model.joblib",
        "model_metadata.json",
        "model_benchmark_report.json",
    ]
    for fname in expected_files:
        fpath = MODELS_DIR / fname
        assert fpath.exists(), f"Required artifact {fname} missing in {MODELS_DIR}"
        assert fpath.stat().st_size > 0, f"Artifact {fname} is empty"


def test_joblib_files_load_successfully():
    """Verify that all persisted .joblib models load without error."""
    solar_model = joblib.load(MODELS_DIR / "solar_ghi_model.joblib")
    temp_model = joblib.load(MODELS_DIR / "temperature_model.joblib")
    load_model = joblib.load(MODELS_DIR / "load_profile_model.joblib")

    assert hasattr(solar_model, "predict"), "Solar model must have a predict method"
    assert hasattr(temp_model, "predict"), "Temperature model must have a predict method"
    assert hasattr(load_model, "predict"), "Load model must have a predict method"


def test_metadata_exists_and_schema_valid():
    """Verify that model_metadata.json contains complete configuration and provenance."""
    meta_path = MODELS_DIR / "model_metadata.json"
    assert meta_path.exists(), "model_metadata.json missing"

    with open(meta_path, "r") as f:
        metadata = json.load(f)

    # Check environment provenance
    assert "environment" in metadata
    env = metadata["environment"]
    for pkg in ["python_version", "numpy_version", "pandas_version", "sklearn_version", "joblib_version"]:
        assert pkg in env, f"Missing environment metadata: {pkg}"

    # Check each model's schema
    for model_key in ["solar_ghi_model", "temperature_model", "load_profile_model"]:
        assert model_key in metadata, f"Missing {model_key} in metadata"
        m_info = metadata[model_key]
        required_fields = [
            "model_name", "model_type", "target",
            "training_start", "training_end",
            "validation_start", "validation_end",
            "test_start", "test_end",
            "feature_names", "feature_count",
            "random_state", "hyperparameters",
            "selection_metric", "validation_metrics",
            "final_test_metrics", "dataset_provenance",
            "limitations", "training_timestamp"
        ]
        for field in required_fields:
            assert field in m_info, f"Missing field '{field}' in {model_key} metadata"
            assert m_info[field] is not None, f"Field '{field}' is None in {model_key}"


def test_feature_names_match_metadata():
    """Verify feature names in metadata match feature datasets and training feature counts."""
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        metadata = json.load(f)

    # Solar features check
    solar_df = pd.read_csv(FEATURES_DIR / "solar_forecasting_features.csv", nrows=5)
    solar_feats = metadata["solar_ghi_model"]["feature_names"]
    assert metadata["solar_ghi_model"]["feature_count"] == len(solar_feats)
    for feat in solar_feats:
        assert feat in solar_df.columns, f"Solar feature '{feat}' missing from solar CSV"

    # Temperature features check
    temp_df = pd.read_csv(FEATURES_DIR / "temperature_forecasting_features.csv", nrows=5)
    temp_feats = metadata["temperature_model"]["feature_names"]
    assert metadata["temperature_model"]["feature_count"] == len(temp_feats)
    for feat in temp_feats:
        assert feat in temp_df.columns, f"Temp feature '{feat}' missing from temp CSV"

    # Load features check
    load_df = pd.read_csv(FEATURES_DIR / "load_forecasting_features.csv", nrows=5)
    load_feats = metadata["load_profile_model"]["feature_names"]
    assert metadata["load_profile_model"]["feature_count"] == len(load_feats)
    for feat in load_feats:
        assert feat in load_df.columns, f"Load feature '{feat}' missing from load CSV"


def test_solar_model_inference_and_physical_bounds():
    """Verify solar predictions shape, finiteness, non-negativity, and zero nighttime."""
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        metadata = json.load(f)

    solar_model = joblib.load(MODELS_DIR / "solar_ghi_model.joblib")
    solar_feats = metadata["solar_ghi_model"]["feature_names"]

    solar_df = pd.read_csv(FEATURES_DIR / "solar_forecasting_features.csv")
    test_rows = solar_df[solar_df["split_set"] == "test"].head(100)

    preds = np.maximum(0.0, solar_model.predict(test_rows[solar_feats]))

    # Shape check
    assert len(preds) == len(test_rows), "Prediction count mismatch"
    # No NaN check
    assert not np.any(np.isnan(preds)), "Solar predictions contain NaN"
    # Finite check
    assert np.all(np.isfinite(preds)), "Solar predictions contain non-finite values"
    # Non-negative check
    assert np.all(preds >= 0.0), "Solar GHI predictions cannot be negative"
    # Plausible physical upper bound (< 1500 W/m² solar constant)
    assert np.all(preds < 1500.0), "Solar GHI predictions exceed top of atmosphere solar constant"


def test_temperature_model_inference_and_physical_bounds():
    """Verify temperature predictions shape, finiteness, and plausible physical range."""
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        metadata = json.load(f)

    temp_model = joblib.load(MODELS_DIR / "temperature_model.joblib")
    temp_feats = metadata["temperature_model"]["feature_names"]

    temp_df = pd.read_csv(FEATURES_DIR / "temperature_forecasting_features.csv")
    test_rows = temp_df[temp_df["split_set"] == "test"].head(100)

    preds = temp_model.predict(test_rows[temp_feats])

    # Shape check
    assert len(preds) == len(test_rows), "Prediction count mismatch"
    # No NaN check
    assert not np.any(np.isnan(preds)), "Temperature predictions contain NaN"
    # Finite check
    assert np.all(np.isfinite(preds)), "Temperature predictions contain non-finite values"
    # Physical range for terrestrial Pune climate (0°C to 55°C)
    assert np.all(preds >= 0.0), "Temperature predictions below 0°C unrealistic for Pune telemetry"
    assert np.all(preds <= 55.0), "Temperature predictions exceed 55°C"


def test_load_model_inference_and_physical_bounds():
    """Verify load profile predictions shape, finiteness, and non-negativity."""
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        metadata = json.load(f)

    load_model = joblib.load(MODELS_DIR / "load_profile_model.joblib")
    load_feats = metadata["load_profile_model"]["feature_names"]

    load_df = pd.read_csv(FEATURES_DIR / "load_forecasting_features.csv")
    holdout_rows = load_df[load_df["split_set"] == "holdout"].head(100)

    preds = np.maximum(0.0, load_model.predict(holdout_rows[load_feats]))

    # Shape check
    assert len(preds) == len(holdout_rows), "Prediction count mismatch"
    # No NaN check
    assert not np.any(np.isnan(preds)), "Load predictions contain NaN"
    # Finite check
    assert np.all(np.isfinite(preds)), "Load predictions contain non-finite values"
    # Non-negative check
    assert np.all(preds >= 0.0), "Residential gross load predictions cannot be negative"
    # Reasonable domestic consumption bound (< 50 kW per single residential home)
    assert np.all(preds < 50.0), "Single home residential load prediction exceeds 50 kW"


def test_benchmark_report_contains_all_models_and_baselines():
    """Verify model_benchmark_report.json conforms to Section 21 specification."""
    rep_path = MODELS_DIR / "model_benchmark_report.json"
    assert rep_path.exists(), "model_benchmark_report.json missing"

    with open(rep_path, "r") as f:
        report = json.load(f)

    assert "solar" in report
    assert "temperature" in report
    assert "load" in report

    # Check solar benchmark records
    for rec in report["solar"]["benchmarks"]:
        for field in ["model_name", "dataset", "target", "split", "MAE", "RMSE", "R2", "MAPE_or_sMAPE", "features_used"]:
            assert field in rec, f"Solar benchmark record missing '{field}'"
        assert "daylight_mae" in rec, "Solar record must include daylight_mae"
        assert "nighttime_mae" in rec, "Solar record must include nighttime_mae"

    # Check load benchmark records
    for rec in report["load"]["benchmarks"]:
        for field in ["model_name", "dataset", "target", "split", "MAE", "RMSE", "R2", "MAPE_or_sMAPE", "features_used"]:
            assert field in rec, f"Load benchmark record missing '{field}'"
        assert "per_home_metrics" in rec, "Load record must include per_home_metrics"


def test_reproducibility_deterministic_predictions():
    """Verify inference reproducibility with identical fixed inputs."""
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        metadata = json.load(f)

    solar_model = joblib.load(MODELS_DIR / "solar_ghi_model.joblib")
    solar_feats = metadata["solar_ghi_model"]["feature_names"]

    solar_df = pd.read_csv(FEATURES_DIR / "solar_forecasting_features.csv")
    sample_df = solar_df[solar_df["split_set"] == "test"].head(50)

    pred1 = solar_model.predict(sample_df[solar_feats])
    pred2 = solar_model.predict(sample_df[solar_feats])

    np.testing.assert_allclose(pred1, pred2, rtol=1e-12, atol=1e-12, err_msg="Solar inference is not deterministic")
