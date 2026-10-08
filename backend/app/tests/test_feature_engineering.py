import os
import json
import pytest
import numpy as np
import pandas as pd
from app.ml.feature_engineering import (
    haurwitz_clearsky_proxy,
    assign_continuous_sequences,
    assert_no_feature_leakage,
    SolarFeaturePipeline,
    TemperatureFeaturePipeline,
    LoadFeaturePipeline,
)


@pytest.fixture(scope="module")
def solar_features():
    fp = "backend/data/features/solar_forecasting_features.csv"
    assert os.path.exists(fp), f"Missing {fp}"
    return pd.read_csv(fp)


@pytest.fixture(scope="module")
def temp_features():
    fp = "backend/data/features/temperature_forecasting_features.csv"
    assert os.path.exists(fp), f"Missing {fp}"
    return pd.read_csv(fp)


@pytest.fixture(scope="module")
def load_features():
    fp = "backend/data/features/load_forecasting_features.csv"
    assert os.path.exists(fp), f"Missing {fp}"
    return pd.read_csv(fp)


@pytest.fixture(scope="module")
def feature_metadata():
    fp = "backend/data/features/feature_metadata.json"
    assert os.path.exists(fp), f"Missing {fp}"
    with open(fp, "r") as f:
        return json.load(f)


# =====================================================================
# 1. SOLAR FEATURE TESTS
# =====================================================================

def test_solar_feature_columns_and_frequency(solar_features):
    """Test required columns, 15-minute spacing, and valid target."""
    required = [
        "timestamp", "sequence_id", "split_set", "target_ghi_wm2",
        "minute_of_day", "slot_15m", "hour", "day_of_week", "day_of_year", "month",
        "day_of_year_sin", "day_of_year_cos", "slot_15m_sin", "slot_15m_cos",
        "solar_elevation_deg", "solar_elevation_sin", "solar_elevation_cos", "is_night",
        "clearsky_proxy_wm2", "ghi_lag_15m", "ghi_lag_30m", "ghi_lag_45m", "ghi_lag_24h",
        "ghi_roll_mean_2h", "ghi_roll_std_2h", "temperature_c", "temperature_lag_24h"
    ]
    for col in required:
        assert col in solar_features.columns, f"Missing solar feature: {col}"

    dts = pd.to_datetime(solar_features["timestamp"])
    diffs = dts.diff().dropna()
    assert (diffs == pd.Timedelta(minutes=15)).all(), "Non-15m interval found in continuous grid"


def test_solar_lag_direction_and_24h_correctness(solar_features):
    """Test lag direction: lag_15m(t) is strictly earlier than target(t)."""
    # In continuous sequences, lag_15m at row i must match target at row i-1
    same_seq = (solar_features["sequence_id"] == solar_features["sequence_id"].shift(1)) & (solar_features["sequence_id"] != -1)
    matching_rows = solar_features[same_seq]
    assert len(matching_rows) > 0

    diff = np.abs(matching_rows["ghi_lag_15m"] - solar_features["target_ghi_wm2"].shift(1).loc[matching_rows.index])
    assert (diff.dropna() < 1e-2).all(), "ghi_lag_15m does not equal target_ghi_wm2 shifted by 1"

    # 24h lag equals target shifted by 96 steps
    same_seq_24h = (solar_features["sequence_id"] == solar_features["sequence_id"].shift(96)) & (solar_features["sequence_id"] != -1)
    matching_24h = solar_features[same_seq_24h]
    assert len(matching_24h) > 0
    diff_24h = np.abs(matching_24h["ghi_lag_24h"] - solar_features["target_ghi_wm2"].shift(96).loc[matching_24h.index])
    assert (diff_24h.dropna() < 1e-2).all(), "ghi_lag_24h does not equal target_ghi_wm2 shifted by 96"


def test_solar_rolling_features_backward_looking(solar_features):
    """Test that rolling features are backward-looking and exclude target at t."""
    valid_roll = solar_features["ghi_roll_mean_2h"].notna()
    sample_idx = solar_features[valid_roll].index[100]
    expected_mean = round(solar_features["target_ghi_wm2"].iloc[sample_idx-8:sample_idx].mean(), 2)
    actual_mean = solar_features["ghi_roll_mean_2h"].iloc[sample_idx]
    assert abs(expected_mean - actual_mean) <= 0.05, f"Expected {expected_mean}, got {actual_mean}"


def test_solar_sequence_breaks_prevent_lag_crossing(solar_features):
    """Test that sequence breaks prevent lag features from bridging outages."""
    # Find sequence transitions
    seq_change = (solar_features["sequence_id"] != solar_features["sequence_id"].shift(1))
    first_in_new_seq = solar_features[seq_change & (solar_features["sequence_id"] != -1)]
    assert len(first_in_new_seq) > 0
    # First row in any new sequence MUST have NaN for lag_15m
    assert first_in_new_seq["ghi_lag_15m"].isna().all(), "lag_15m bridged across sequence break!"


def test_solar_clearsky_proxy():
    """Verify Haurwitz clear-sky proxy produces zero at night and realistic daytime values."""
    cs_night = haurwitz_clearsky_proxy(np.array([-10.0, -5.0, 0.0]))
    assert (cs_night == 0.0).all()
    cs_day = haurwitz_clearsky_proxy(np.array([15.0, 45.0, 85.0]))
    assert cs_day[0] > 100.0 and cs_day[1] > 600.0 and cs_day[2] > 900.0


def test_solar_chronological_splits(solar_features):
    """Test strict chronological train < validation < test splits."""
    dts = pd.to_datetime(solar_features["timestamp"])
    train_max = dts[solar_features["split_set"] == "train"].max()
    val_min = dts[solar_features["split_set"] == "validation"].min()
    val_max = dts[solar_features["split_set"] == "validation"].max()
    test_min = dts[solar_features["split_set"] == "test"].min()

    assert train_max < val_min, "Train overlaps validation"
    assert val_max < test_min, "Validation overlaps test"


# =====================================================================
# 2. TEMPERATURE FEATURE TESTS
# =====================================================================

def test_temperature_feature_columns_and_lags(temp_features):
    """Test temperature target, lags, and sequence safety."""
    required = [
        "timestamp", "sequence_id", "split_set", "target_temperature_c",
        "minute_of_day", "slot_15m", "hour", "day_of_week", "day_of_year", "month",
        "day_of_year_sin", "day_of_year_cos", "slot_15m_sin", "slot_15m_cos",
        "solar_elevation_deg", "temperature_lag_15m", "temperature_lag_24h",
        "temperature_roll_mean_1h", "temperature_roll_std_1h"
    ]
    for col in required:
        assert col in temp_features.columns

    same_seq = (temp_features["sequence_id"] == temp_features["sequence_id"].shift(1)) & (temp_features["sequence_id"] != -1)
    matching = temp_features[same_seq]
    diff = np.abs(matching["temperature_lag_15m"] - temp_features["target_temperature_c"].shift(1).loc[matching.index])
    assert (diff.dropna() < 1e-2).all(), "temperature_lag_15m does not equal target shifted by 1"


# =====================================================================
# 3. LOAD FEATURE TESTS
# =====================================================================

def test_load_home_isolation_and_no_cross_home_leakage(load_features):
    """Test that all lags and rolling windows are strictly isolated per home."""
    assert "home_id" in load_features.columns
    unique_homes = sorted(load_features["home_id"].unique().tolist())
    assert unique_homes == list(range(1, 11))

    for h in unique_homes:
        h_df = load_features[load_features["home_id"] == h]
        first_idx = h_df.index[0]
        # First row of any home MUST have NaN for lag_15m (never leaks from prior home)
        assert pd.isna(load_features.loc[first_idx, "load_lag_15m"]), f"Home {h} initial row leaked lag from prior home!"
        assert pd.isna(load_features.loc[first_idx, "load_roll_mean_1h"]), f"Home {h} initial row leaked rolling stats!"


def test_load_target_and_local_calendar_features(load_features):
    """Test gross load target, 15-minute local Austin calendar slots, and non-negativity."""
    valid_target = load_features["target_gross_load_kw"].dropna()
    assert (valid_target >= 0.0).all(), "Negative gross load found"
    assert (load_features["slot_15m"] >= 0).all() and (load_features["slot_15m"] <= 95).all()
    assert (load_features["minute_of_day"] >= 0).all() and (load_features["minute_of_day"] <= 1425).all()


def test_load_chronological_splits(load_features):
    """Test strict chronological train < validation < holdout splits for Pecan."""
    dts = pd.to_datetime(load_features["timestamp"])
    train_max = dts[load_features["split_set"] == "train"].max()
    val_min = dts[load_features["split_set"] == "validation"].min()
    val_max = dts[load_features["split_set"] == "validation"].max()
    holdout_min = dts[load_features["split_set"] == "holdout"].min()

    assert train_max < val_min, "Pecan train overlaps validation"
    assert val_max < holdout_min, "Pecan validation overlaps holdout"


# =====================================================================
# 4. LEAKAGE CHECKER ENGINE TESTS (FAILS LOUDLY)
# =====================================================================

def test_leakage_detector_raises_on_target_identity():
    """Verify that assert_no_feature_leakage raises AssertionError if a feature leaks the target."""
    leaky_df = pd.DataFrame({
        "timestamp": pd.date_range("2024-05-11 00:00", periods=50, freq="15min"),
        "target_val": np.arange(50.0),
        "leaked_feature": np.arange(50.0), # Identical to target
        "split_set": ["train"] * 30 + ["validation"] * 20
    })
    with pytest.raises(AssertionError, match="CRITICAL LEAKAGE"):
        assert_no_feature_leakage(leaky_df, "test_dataset", "target_val", [])


def test_leakage_detector_raises_on_split_overlap():
    """Verify that assert_no_feature_leakage raises AssertionError if splits are reversed/shuffled."""
    shuffled_df = pd.DataFrame({
        "timestamp": pd.date_range("2024-05-11 00:00", periods=50, freq="15min"),
        "target_val": np.arange(50.0),
        "split_set": ["validation"] * 30 + ["train"] * 20 # Train after validation
    })
    with pytest.raises(AssertionError, match="SPLIT LEAKAGE"):
        assert_no_feature_leakage(shuffled_df, "test_dataset", "target_val", [])


def test_feature_metadata_structure(feature_metadata):
    """Verify feature metadata schema and zero forward leakage declared."""
    assert len(feature_metadata) >= 50
    for meta in feature_metadata:
        assert "feature_name" in meta
        assert "dataset" in meta
        assert "feature_type" in meta
        assert meta["uses_future_information"] is False, f"Feature {meta['feature_name']} marked as using future info!"
        assert meta["allowed_for_training"] is True
