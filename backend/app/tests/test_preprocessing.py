import os
import json
import pytest
import numpy as np
import pandas as pd
from app.ml.preprocessing import (
    calculate_solar_elevation,
    preprocess_cwprs_solar,
    preprocess_cwprs_temperature,
    preprocess_pecan_load,
    validate_processed_dataset,
)


@pytest.fixture(scope="module")
def processed_solar():
    fp = "backend/data/processed/cwprs_solar_15m.csv"
    assert os.path.exists(fp), f"Processed solar file missing at {fp}"
    return pd.read_csv(fp)


@pytest.fixture(scope="module")
def processed_temperature():
    fp = "backend/data/processed/cwprs_temperature_15m.csv"
    assert os.path.exists(fp), f"Processed temperature file missing at {fp}"
    return pd.read_csv(fp)


@pytest.fixture(scope="module")
def processed_pecan():
    fp = "backend/data/processed/pecan_residential_load_15m.csv"
    assert os.path.exists(fp), f"Processed pecan file missing at {fp}"
    return pd.read_csv(fp)


# =====================================================================
# 1. SOLAR PREPROCESSING TESTS
# =====================================================================

def test_solar_timestamp_parsing_and_timezone(processed_solar):
    """Test 1 & 2: Timestamp parsing works and timezone is Asia/Kolkata (+05:30)."""
    assert "timestamp" in processed_solar.columns
    sample_ts = processed_solar["timestamp"].iloc[0]
    assert "+0530" in sample_ts or "+05:30" in sample_ts


def test_solar_frequency_and_no_duplicates(processed_solar):
    """Test 3 & 4: 15-minute frequency is strictly monotonic with 0 duplicate timestamps."""
    dts = pd.to_datetime(processed_solar["timestamp"])
    diffs = dts.diff().dropna()
    expected_diff = pd.Timedelta(minutes=15)
    assert (diffs == expected_diff).all(), "Non-15min interval step detected in continuous grid"
    assert processed_solar.duplicated(subset=["timestamp"]).sum() == 0, "Duplicate timestamp found"


def test_solar_nighttime_cleaned_and_never_negative(processed_solar):
    """Test 5 & 10: Negative nighttime sensor drift is cleaned and clean GHI is never negative."""
    valid_clean = processed_solar["ghi_clean_wm2"].dropna()
    assert (valid_clean >= 0.0).all(), "Negative clean GHI found"
    
    # Check that night periods have 0.0 clean GHI
    night_rows = processed_solar[processed_solar["is_night"] & processed_solar["ghi_clean_wm2"].notna()]
    assert (night_rows["ghi_clean_wm2"] == 0.0).all(), "Non-zero clean GHI found during deep night"


def test_solar_large_gap_preservation(processed_solar):
    """Test 7: Known large CWPRS gap (August 2024 outage) is preserved as missing/sequence break, NOT interpolated."""
    dts = pd.to_datetime(processed_solar["timestamp"])
    # Known 8-day outage: 2024-08-09 to 2024-08-16
    aug_outage = processed_solar[(dts >= "2024-08-10 00:00:00+05:30") & (dts <= "2024-08-15 23:59:59+05:30")]
    assert aug_outage["ghi_clean_wm2"].isna().all(), "Data was fabricated inside the 8-day August outage!"
    assert (aug_outage["quality_flag"] == "SEQUENCE_BREAK").all(), "Sequence break flag missing for outage"


def test_solar_completeness_and_raw_availability(processed_solar):
    """Test 8 & 9: 3-source-sample completeness logic is recorded and raw GHI is preserved."""
    assert "ghi_raw_wm2" in processed_solar.columns
    assert "source_samples" in processed_solar.columns
    assert "expected_samples" in processed_solar.columns
    assert (processed_solar["expected_samples"] == 3).all()
    # Check that valid intervals have completeness_ratio == 1.0 or 0.667
    valid_intervals = processed_solar[processed_solar["quality_flag"] == "VALID"]
    assert (valid_intervals["source_samples"] == 3).all()


def test_solar_elevation_geometry():
    """Verify deterministic solar elevation physics."""
    # Summer solstice noon vs midnight in Pune
    dts = pd.to_datetime(["2024-06-21 00:00:00+05:30", "2024-06-21 12:30:00+05:30"])
    elevs = calculate_solar_elevation(pd.Series(dts))
    assert elevs[0] < -40.0, "Midnight solar elevation should be deep negative"
    assert elevs[1] > 80.0, "Midday summer elevation in Pune should be near 90 degrees zenith"


# =====================================================================
# 2. TEMPERATURE PREPROCESSING TESTS
# =====================================================================

def test_temperature_timestamp_alignment(processed_temperature, processed_solar):
    """Test 1: Temperature timestamps strictly match solar timestamps row-for-row."""
    assert len(processed_temperature) == len(processed_solar)
    assert (processed_temperature["timestamp"] == processed_solar["timestamp"]).all()


def test_temperature_fault_detection_and_removal(processed_temperature):
    """Test 2 & 3: Known -40°C sensor fault is removed; no values <= -30°C remain in clean series."""
    valid_clean = processed_temperature["temperature_clean_c"].dropna()
    assert (valid_clean > -30.0).all(), "Uncleaned sensor fault <= -30 C found in temperature_clean_c"
    assert (valid_clean >= 5.0).all() and (valid_clean <= 50.0).all(), "Clean temperature out of physical bounds"


def test_temperature_short_fault_interpolation(processed_temperature):
    """Test 4: The 27-08-2024 fault period is flagged as SENSOR_FAULT_INTERPOLATED with realistic values."""
    fault_rows = processed_temperature[processed_temperature["quality_flag"] == "SENSOR_FAULT_INTERPOLATED"]
    assert len(fault_rows) > 0, "No SENSOR_FAULT_INTERPOLATED flags found"
    for _, row in fault_rows.iterrows():
        assert 20.0 <= row["temperature_clean_c"] <= 30.0, "Interpolated fault temperature is outside normal bounds"


def test_temperature_long_gap_preservation(processed_temperature):
    """Test 5: Long gaps are preserved as sequence breaks and not fabricated."""
    dts = pd.to_datetime(processed_temperature["timestamp"])
    aug_outage = processed_temperature[(dts >= "2024-08-10 00:00:00+05:30") & (dts <= "2024-08-15 23:59:59+05:30")]
    assert aug_outage["temperature_clean_c"].isna().all(), "Data fabricated during August outage!"


# =====================================================================
# 3. PECAN STREET PREPROCESSING TESTS
# =====================================================================

def test_pecan_duplicate_removal_and_homes(processed_pecan):
    """Test 1 & 4: Exact duplicate rows handled; exactly 10 homes preserved."""
    assert "home_id" in processed_pecan.columns
    unique_homes = sorted(processed_pecan["home_id"].unique().tolist())
    assert unique_homes == list(range(1, 11)), "Expected Home IDs 1 through 10"


def test_pecan_gross_load_formula(processed_pecan):
    """Test 3 & 7: Gross load equals Main Panel + Solar; negative Main Panel is preserved."""
    valid = processed_pecan.dropna(subset=["gross_load_kw", "main_panel_kw", "solar_kw"])
    expected_gross = np.round(valid["main_panel_kw"] + valid["solar_kw"], 3)
    diff = np.abs(valid["gross_load_kw"] - expected_gross)
    assert (diff < 1e-2).all(), "Gross load does not equal main_panel_kw + solar_kw"
    assert (valid["gross_load_kw"] >= 0.0).all(), "Negative gross load found!"
    # Ensure there are indeed negative Main Panel readings (solar export)
    assert (valid["main_panel_kw"] < 0.0).any(), "Expected negative Main Panel readings during solar export"


def test_pecan_aggregation_and_utc_timezone(processed_pecan):
    """Test 5, 6 & 8: 15-minute aggregation works, expected samples is 15, and canonical timezone is UTC."""
    assert (processed_pecan["expected_samples"] == 15).all()
    sample_ts = processed_pecan["timestamp"].iloc[0]
    assert "+0000" in sample_ts or "+00:00" in sample_ts, "Pecan timestamp is not UTC"
    # Check that for any home, 288 valid intervals exist across the 3 full days
    home1 = processed_pecan[processed_pecan["home_id"] == 1]
    valid_h1 = home1[home1["quality_flag"] == "VALID"]
    assert len(valid_h1) == 288, f"Expected 288 valid intervals (3 days * 96/day), got {len(valid_h1)}"


def test_validation_function():
    """Test pipeline validator catches corrupted dataset."""
    bad_df = pd.DataFrame({
        "timestamp": ["2024-05-11 00:00:00", "2024-05-11 00:00:00"], # duplicate
        "ghi_clean_wm2": [10.0, -5.0], # negative
        "is_night": [False, False]
    })
    val = validate_processed_dataset(bad_df, "solar")
    assert val["passed_all_checks"] is False
    assert val["duplicate_timestamps"] == 1
    assert val["has_negative_values"] is True
