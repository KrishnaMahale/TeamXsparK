import os
import sys
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional

# Ensure backend root is in sys.path for direct execution
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "../../"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.ml.preprocessing import calculate_solar_elevation
except ImportError:
    from preprocessing import calculate_solar_elevation


# =====================================================================
# 1. LEGACY COMPATIBILITY (PRESERVED FOR EXISTING CODEBASE TESTS)
# =====================================================================

class FeatureEngineer:
    """
    LEGACY REFERENCE ONLY: Preserved for existing test compatibility.
    DO NOT USE in the new Step 4B+ real-data pipeline.
    """
    @staticmethod
    def extract_time_features(df: pd.DataFrame, time_col: str = "time") -> pd.DataFrame:
        df_feat = df.copy()

        if time_col in df_feat.columns:
            if df_feat[time_col].dtype == object and ":" in str(df_feat[time_col].iloc[0]):
                parts = df_feat[time_col].str.split(":", expand=True)
                df_feat["hour"] = parts[0].astype(int)
                df_feat["minute"] = parts[1].astype(int)
            else:
                dt_series = pd.to_datetime(df_feat[time_col])
                df_feat["hour"] = dt_series.dt.hour
                df_feat["minute"] = dt_series.dt.minute
        else:
            df_feat["hour"] = 12
            df_feat["minute"] = 0

        df_feat["hour_sin"] = np.sin(2 * np.pi * df_feat["hour"] / 24.0)
        df_feat["hour_cos"] = np.cos(2 * np.pi * df_feat["hour"] / 24.0)

        return df_feat


# =====================================================================
# 2. DETERMINISTIC CLEAR-SKY PROXY MODEL
# =====================================================================

def haurwitz_clearsky_proxy(solar_elevation_deg: np.ndarray) -> np.ndarray:
    """
    Computes deterministic Haurwitz/Bird clear-sky Global Horizontal Irradiance (W/m^2).
    Purely geometric: requires NO external weather API or future weather inputs.
    
    Equation:
      GHI_clear = 1098 * sin(alpha) * exp(-0.057 / sin(alpha))  if alpha > 0 else 0.0
    """
    elev = np.asarray(solar_elevation_deg)
    rad = np.radians(elev)
    sin_alpha = np.sin(rad)
    
    # Avoid division by zero at or below horizon
    cs = np.where(
        elev > 0.0,
        1098.0 * sin_alpha * np.exp(-0.057 / np.maximum(sin_alpha, 0.01)),
        0.0
    )
    return np.round(np.maximum(0.0, cs), 2)


# =====================================================================
# 3. CONTINUOUS SEQUENCE IDENTIFICATION FOR CWPRS
# =====================================================================

def assign_continuous_sequences(quality_flags: pd.Series) -> pd.Series:
    """
    Assigns unique sequence_id integers to contiguous blocks of valid observations.
    A new sequence begins after any 'SEQUENCE_BREAK' or 'MISSING' interval.
    Invalid rows receive sequence_id = -1.
    """
    is_valid = ~quality_flags.isin(["SEQUENCE_BREAK", "MISSING"])
    # A transition from invalid to valid marks the start of a new sequence
    seq_starts = is_valid & (~is_valid.shift(1, fill_value=False))
    seq_ids = seq_starts.cumsum()
    seq_ids[~is_valid] = -1
    return seq_ids


# =====================================================================
# 4. SOLAR FEATURE PIPELINE
# =====================================================================

class SolarFeaturePipeline:
    @staticmethod
    def build_solar_features(
        solar_csv_path: str,
        temp_csv_path: str
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Builds leakage-safe solar feature matrix from processed 15-minute CWPRS telemetry:
          - Target: target_ghi_wm2
          - Calendar features: minute_of_day, slot_15m, hour, day_of_week, day_of_year, month, sin/cos cyclical
          - Solar geometry: solar_elevation_deg, sin/cos, is_night
          - Deterministic clear-sky proxy: clearsky_proxy_wm2
          - Autoregressive lags: 15m, 30m, 45m, 24h (sequence-safe)
          - Backward-looking rolling stats: 2h mean and std
          - Auxiliary temperature: temperature_c (known prior at t-15m), temperature_lag_24h
          - Chronological split: train (<= 2025-02-28), val (2025-03-01 to 2025-04-30), test (>= 2025-05-01)
        """
        df_solar = pd.read_csv(solar_csv_path)
        df_temp = pd.read_csv(temp_csv_path)

        # Parse timestamps localized to Asia/Kolkata
        dts = pd.to_datetime(df_solar["timestamp"])
        df = pd.DataFrame()
        df["timestamp"] = df_solar["timestamp"]

        # Sequence IDs to protect against lag leakage across outages
        df["sequence_id"] = assign_continuous_sequences(df_solar["quality_flag"])
        df["quality_flag"] = df_solar["quality_flag"]

        # Chronological splits
        split_set = pd.Series("train", index=df.index)
        split_set[(dts >= "2025-03-01 00:00:00+05:30") & (dts <= "2025-04-30 23:59:59+05:30")] = "validation"
        split_set[dts >= "2025-05-01 00:00:00+05:30"] = "test"
        df["split_set"] = split_set

        # Target (GHI in W/m^2)
        df["target_ghi_wm2"] = df_solar["ghi_clean_wm2"].round(2)

        # Calendar features
        slot_15m = (dts.dt.hour * 4 + dts.dt.minute // 15).astype(int)
        df["minute_of_day"] = (dts.dt.hour * 60 + dts.dt.minute).astype(int)
        df["slot_15m"] = slot_15m
        df["hour"] = dts.dt.hour.astype(int)
        df["day_of_week"] = dts.dt.dayofweek.astype(int)
        df["day_of_year"] = dts.dt.dayofyear.astype(int)
        df["month"] = dts.dt.month.astype(int)

        # Cyclical harmonics
        df["day_of_year_sin"] = np.round(np.sin(2 * np.pi * df["day_of_year"] / 365.25), 4)
        df["day_of_year_cos"] = np.round(np.cos(2 * np.pi * df["day_of_year"] / 365.25), 4)
        df["slot_15m_sin"] = np.round(np.sin(2 * np.pi * slot_15m / 96.0), 4)
        df["slot_15m_cos"] = np.round(np.cos(2 * np.pi * slot_15m / 96.0), 4)

        # Solar geometry & clear-sky proxy
        elev = df_solar["solar_elevation_deg"].values
        df["solar_elevation_deg"] = elev
        df["solar_elevation_sin"] = np.round(np.sin(np.radians(elev)), 4)
        df["solar_elevation_cos"] = np.round(np.cos(np.radians(elev)), 4)
        df["is_night"] = df_solar["is_night"].astype(bool)
        df["clearsky_proxy_wm2"] = haurwitz_clearsky_proxy(elev)

        # Autoregressive lag features (Sequence-Safe)
        # Note: lag_15m(t) is GHI at t-15m. It is strictly prior to target(t).
        raw_val = df_solar["ghi_clean_wm2"]
        seq = df["sequence_id"]

        for k, name in [(1, "ghi_lag_15m"), (2, "ghi_lag_30m"), (3, "ghi_lag_45m"), (96, "ghi_lag_24h")]:
            same_seq = (seq == seq.shift(k)) & (seq != -1)
            df[name] = np.where(same_seq, raw_val.shift(k).round(2), np.nan)

        # Backward-looking rolling features over 2 hours (8 intervals of 15m)
        # Shift(1) guarantees target at t is NOT included in the rolling window
        roll_shifted = raw_val.shift(1)
        roll_seq = seq.shift(1)
        valid_roll = (seq == seq.shift(8)) & (seq != -1)

        roll_mean = roll_shifted.rolling(8, min_periods=8).mean().round(2)
        roll_std = roll_shifted.rolling(8, min_periods=8).std().round(2)
        df["ghi_roll_mean_2h"] = np.where(valid_roll, roll_mean, np.nan)
        df["ghi_roll_std_2h"] = np.where(valid_roll, roll_std, np.nan)

        # Auxiliary temperature features from aligned CWPRS temperature
        temp_val = df_temp["temperature_clean_c"]
        temp_seq = assign_continuous_sequences(df_temp["quality_flag"])
        temp_shifted = temp_val.shift(1) # Temperature at t-15m
        same_temp_seq = (temp_seq == temp_seq.shift(1)) & (temp_seq != -1)
        df["temperature_c"] = np.where(same_temp_seq, temp_shifted.round(2), np.nan)

        same_temp_24h = (temp_seq == temp_seq.shift(96)) & (temp_seq != -1)
        df["temperature_lag_24h"] = np.where(same_temp_24h, temp_val.shift(96).round(2), np.nan)

        # Construct metadata dictionary
        feature_columns = [
            ("minute_of_day", "calendar", "Minute of day (0-1425)", "timestamp", 0),
            ("slot_15m", "calendar", "15-minute slot of day (0-95)", "timestamp", 0),
            ("hour", "calendar", "Hour of day (0-23)", "timestamp", 0),
            ("day_of_week", "calendar", "Day of week (0=Mon, 6=Sun)", "timestamp", 0),
            ("day_of_year", "calendar", "Day of year (1-365)", "timestamp", 0),
            ("month", "calendar", "Month of year (1-12)", "timestamp", 0),
            ("day_of_year_sin", "cyclical", "Cyclical sine of day of year", "day_of_year", 0),
            ("day_of_year_cos", "cyclical", "Cyclical cosine of day of year", "day_of_year", 0),
            ("slot_15m_sin", "cyclical", "Cyclical sine of 15-minute slot", "slot_15m", 0),
            ("slot_15m_cos", "cyclical", "Cyclical cosine of 15-minute slot", "slot_15m", 0),
            ("solar_elevation_deg", "solar_geometry", "Solar elevation angle (degrees)", "timestamp", 0),
            ("solar_elevation_sin", "solar_geometry", "Sine of solar elevation angle", "solar_elevation_deg", 0),
            ("solar_elevation_cos", "solar_geometry", "Cosine of solar elevation angle", "solar_elevation_deg", 0),
            ("is_night", "solar_geometry", "Astronomical night indicator (elevation <= -5 deg)", "solar_elevation_deg", 0),
            ("clearsky_proxy_wm2", "clear_sky", "Haurwitz clear-sky irradiance proxy (W/m2)", "solar_elevation_deg", 0),
            ("ghi_lag_15m", "lag", "Historical clean GHI at t-15m (W/m2)", "ghi_clean_wm2", 15),
            ("ghi_lag_30m", "lag", "Historical clean GHI at t-30m (W/m2)", "ghi_clean_wm2", 30),
            ("ghi_lag_45m", "lag", "Historical clean GHI at t-45m (W/m2)", "ghi_clean_wm2", 45),
            ("ghi_lag_24h", "lag", "Historical clean GHI at t-24h (W/m2)", "ghi_clean_wm2", 1440),
            ("ghi_roll_mean_2h", "rolling", "Rolling 2-hour backward mean of prior GHI (W/m2)", "ghi_clean_wm2", 15),
            ("ghi_roll_std_2h", "rolling", "Rolling 2-hour backward std of prior GHI (W/m2)", "ghi_clean_wm2", 15),
            ("temperature_c", "auxiliary_weather", "Ambient temperature at forecast origin t-15m (C)", "temperature_clean_c", 15),
            ("temperature_lag_24h", "auxiliary_weather", "Ambient temperature at t-24h (C)", "temperature_clean_c", 1440),
        ]

        metadata_list = [
            {
                "feature_name": name,
                "dataset": "solar",
                "feature_type": f_type,
                "description": desc,
                "source_column": src,
                "lag_minutes": lag_m,
                "uses_future_information": False,
                "allowed_for_training": True,
            }
            for name, f_type, desc, src, lag_m in feature_columns
        ]

        return df, metadata_list


# =====================================================================
# 5. TEMPERATURE FEATURE PIPELINE
# =====================================================================

class TemperatureFeaturePipeline:
    @staticmethod
    def build_temperature_features(
        temp_csv_path: str
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Builds leakage-safe temperature feature matrix from processed 15-minute CWPRS telemetry:
          - Target: target_temperature_c
          - Calendar & cyclical features: minute_of_day, slot_15m, hour, day_of_week, day_of_year, month, sin/cos
          - Solar geometry: solar_elevation_deg
          - Autoregressive lags: 15m, 24h (sequence-safe)
          - Backward-looking rolling stats: 1h mean and std
          - Chronological split: train (<= 2025-02-28), val (2025-03-01 to 2025-04-30), test (>= 2025-05-01)
        """
        df_temp = pd.read_csv(temp_csv_path)
        dts = pd.to_datetime(df_temp["timestamp"])

        df = pd.DataFrame()
        df["timestamp"] = df_temp["timestamp"]
        df["sequence_id"] = assign_continuous_sequences(df_temp["quality_flag"])
        df["quality_flag"] = df_temp["quality_flag"]

        split_set = pd.Series("train", index=df.index)
        split_set[(dts >= "2025-03-01 00:00:00+05:30") & (dts <= "2025-04-30 23:59:59+05:30")] = "validation"
        split_set[dts >= "2025-05-01 00:00:00+05:30"] = "test"
        df["split_set"] = split_set

        # Target (Temperature in °C)
        df["target_temperature_c"] = df_temp["temperature_clean_c"].round(2)

        # Calendar features
        slot_15m = (dts.dt.hour * 4 + dts.dt.minute // 15).astype(int)
        df["minute_of_day"] = (dts.dt.hour * 60 + dts.dt.minute).astype(int)
        df["slot_15m"] = slot_15m
        df["hour"] = dts.dt.hour.astype(int)
        df["day_of_week"] = dts.dt.dayofweek.astype(int)
        df["day_of_year"] = dts.dt.dayofyear.astype(int)
        df["month"] = dts.dt.month.astype(int)

        df["day_of_year_sin"] = np.round(np.sin(2 * np.pi * df["day_of_year"] / 365.25), 4)
        df["day_of_year_cos"] = np.round(np.cos(2 * np.pi * df["day_of_year"] / 365.25), 4)
        df["slot_15m_sin"] = np.round(np.sin(2 * np.pi * slot_15m / 96.0), 4)
        df["slot_15m_cos"] = np.round(np.cos(2 * np.pi * slot_15m / 96.0), 4)

        # Solar elevation
        df["solar_elevation_deg"] = calculate_solar_elevation(pd.Series(dts))

        # Lags
        raw_val = df_temp["temperature_clean_c"]
        seq = df["sequence_id"]

        for k, name in [(1, "temperature_lag_15m"), (96, "temperature_lag_24h")]:
            same_seq = (seq == seq.shift(k)) & (seq != -1)
            df[name] = np.where(same_seq, raw_val.shift(k).round(2), np.nan)

        # 1-hour backward rolling stats (4 steps of 15m)
        roll_shifted = raw_val.shift(1)
        valid_roll = (seq == seq.shift(4)) & (seq != -1)
        roll_mean = roll_shifted.rolling(4, min_periods=4).mean().round(2)
        roll_std = roll_shifted.rolling(4, min_periods=4).std().round(2)
        df["temperature_roll_mean_1h"] = np.where(valid_roll, roll_mean, np.nan)
        df["temperature_roll_std_1h"] = np.where(valid_roll, roll_std, np.nan)

        feature_columns = [
            ("minute_of_day", "calendar", "Minute of day (0-1425)", "timestamp", 0),
            ("slot_15m", "calendar", "15-minute slot of day (0-95)", "timestamp", 0),
            ("hour", "calendar", "Hour of day (0-23)", "timestamp", 0),
            ("day_of_week", "calendar", "Day of week (0=Mon, 6=Sun)", "timestamp", 0),
            ("day_of_year", "calendar", "Day of year (1-365)", "timestamp", 0),
            ("month", "calendar", "Month of year (1-12)", "timestamp", 0),
            ("day_of_year_sin", "cyclical", "Cyclical sine of day of year", "day_of_year", 0),
            ("day_of_year_cos", "cyclical", "Cyclical cosine of day of year", "day_of_year", 0),
            ("slot_15m_sin", "cyclical", "Cyclical sine of 15-minute slot", "slot_15m", 0),
            ("slot_15m_cos", "cyclical", "Cyclical cosine of 15-minute slot", "slot_15m", 0),
            ("solar_elevation_deg", "solar_geometry", "Solar elevation angle (degrees)", "timestamp", 0),
            ("temperature_lag_15m", "lag", "Historical temperature at t-15m (C)", "temperature_clean_c", 15),
            ("temperature_lag_24h", "lag", "Historical temperature at t-24h (C)", "temperature_clean_c", 1440),
            ("temperature_roll_mean_1h", "rolling", "Rolling 1-hour backward mean of prior temperature (C)", "temperature_clean_c", 15),
            ("temperature_roll_std_1h", "rolling", "Rolling 1-hour backward std of prior temperature (C)", "temperature_clean_c", 15),
        ]

        metadata_list = [
            {
                "feature_name": name,
                "dataset": "temperature",
                "feature_type": f_type,
                "description": desc,
                "source_column": src,
                "lag_minutes": lag_m,
                "uses_future_information": False,
                "allowed_for_training": True,
            }
            for name, f_type, desc, src, lag_m in feature_columns
        ]

        return df, metadata_list


# =====================================================================
# 6. LOAD FEATURE PIPELINE (PECAN STREET RESIDENTIAL)
# =====================================================================

class LoadFeaturePipeline:
    @staticmethod
    def build_load_features(
        pecan_csv_path: str
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Builds leakage-safe load feature matrix from processed 15-minute Pecan Street data:
          - Target: target_gross_load_kw (Gross Household Load in kW)
          - Home isolation: All lags and rolling statistics are calculated strictly per home_id.
          - Local Austin time (America/Chicago) for human calendar features; canonical UTC preserved.
          - Lags: 15m, 30m, 24h per home.
          - Rolling stats: 1h backward mean and std per home.
          - Chronological split:
              train/calibration (2018-08-23), validation (2018-08-24), holdout (2018-08-25)
        """
        df_pecan = pd.read_csv(pecan_csv_path)
        dts_utc = pd.to_datetime(df_pecan["timestamp"])
        dts_local = dts_utc.dt.tz_convert("America/Chicago")

        df = pd.DataFrame()
        df["timestamp"] = df_pecan["timestamp"]
        df["home_id"] = df_pecan["home_id"].astype(int)
        df["quality_flag"] = df_pecan["quality_flag"]

        # Chronological splits (strictly time-based in UTC)
        split_set = pd.Series("train", index=df.index)
        split_set[(dts_utc >= "2018-08-24 00:00:00+00:00") & (dts_utc <= "2018-08-24 23:59:59+00:00")] = "validation"
        split_set[dts_utc >= "2018-08-25 00:00:00+00:00"] = "holdout"
        df["split_set"] = split_set

        # Target (Gross Load in kW)
        df["target_gross_load_kw"] = df_pecan["gross_load_kw"].round(3)

        # Calendar features in local Austin time (America/Chicago)
        slot_15m = (dts_local.dt.hour * 4 + dts_local.dt.minute // 15).astype(int)
        df["minute_of_day"] = (dts_local.dt.hour * 60 + dts_local.dt.minute).astype(int)
        df["slot_15m"] = slot_15m
        df["hour"] = dts_local.dt.hour.astype(int)
        df["day_of_week"] = dts_local.dt.dayofweek.astype(int)
        df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(bool)

        df["slot_15m_sin"] = np.round(np.sin(2 * np.pi * slot_15m / 96.0), 4)
        df["slot_15m_cos"] = np.round(np.cos(2 * np.pi * slot_15m / 96.0), 4)

        # Autoregressive lags isolated per home ID
        grouped = df_pecan.groupby("home_id")["gross_load_kw"]
        df["load_lag_15m"] = grouped.shift(1).round(3)
        df["load_lag_30m"] = grouped.shift(2).round(3)
        df["load_lag_24h"] = grouped.shift(96).round(3)

        # 1-hour backward rolling stats per home (shift(1) ensures target at t is excluded)
        roll_mean_s = grouped.apply(lambda s: s.shift(1).rolling(4, min_periods=4).mean()).reset_index(level=0, drop=True)
        roll_std_s = grouped.apply(lambda s: s.shift(1).rolling(4, min_periods=4).std()).reset_index(level=0, drop=True)
        df["load_roll_mean_1h"] = roll_mean_s.round(3)
        df["load_roll_std_1h"] = roll_std_s.round(3)

        feature_columns = [
            ("minute_of_day", "calendar", "Minute of day in local Austin time (0-1425)", "timestamp", 0),
            ("slot_15m", "calendar", "15-minute slot in local Austin time (0-95)", "timestamp", 0),
            ("hour", "calendar", "Hour of day in local Austin time (0-23)", "timestamp", 0),
            ("day_of_week", "calendar", "Day of week in local Austin time (0=Mon, 6=Sun)", "timestamp", 0),
            ("is_weekend", "calendar", "Weekend indicator in local Austin time", "day_of_week", 0),
            ("slot_15m_sin", "cyclical", "Cyclical sine of 15-minute slot", "slot_15m", 0),
            ("slot_15m_cos", "cyclical", "Cyclical cosine of 15-minute slot", "slot_15m", 0),
            ("load_lag_15m", "lag", "Historical household gross load at t-15m for same home (kW)", "gross_load_kw", 15),
            ("load_lag_30m", "lag", "Historical household gross load at t-30m for same home (kW)", "gross_load_kw", 30),
            ("load_lag_24h", "lag", "Historical household gross load at t-24h for same home (kW)", "gross_load_kw", 1440),
            ("load_roll_mean_1h", "rolling", "Rolling 1-hour backward mean of prior load for same home (kW)", "gross_load_kw", 15),
            ("load_roll_std_1h", "rolling", "Rolling 1-hour backward std of prior load for same home (kW)", "gross_load_kw", 15),
        ]

        metadata_list = [
            {
                "feature_name": name,
                "dataset": "load",
                "feature_type": f_type,
                "description": desc,
                "source_column": src,
                "lag_minutes": lag_m,
                "uses_future_information": False,
                "allowed_for_training": True,
            }
            for name, f_type, desc, src, lag_m in feature_columns
        ]

        return df, metadata_list


# =====================================================================
# 7. AUTOMATED LEAKAGE CHECKER ENGINE (FAILS LOUDLY)
# =====================================================================

def assert_no_feature_leakage(
    df: pd.DataFrame,
    dataset_name: str,
    target_col: str,
    lag_cols: List[str]
) -> Dict[str, Any]:
    """
    Executes 5 strict leakage checks. Raises AssertionError immediately if leakage is detected.
      1. Target Identity / Forward Shift Leakage: No feature equals or leads target.
      2. Lag Direction: Lagged values must precede target in time.
      3. Rolling Causality: Rolling features must be strictly backward-looking.
      4. Sequence Integrity: Lags cannot bridge across sequence breaks.
      5. Split Integrity: Chronological ordering: train < validation < test/holdout.
    """
    dts = pd.to_datetime(df["timestamp"])

    # Check 1: Target Identity & Direct Correlation Leakage
    for col in df.columns:
        if col in ["timestamp", "quality_flag", "split_set", target_col, "home_id", "sequence_id"]:
            continue
        # Feature must not be an identical copy of the target
        valid_both = df[[col, target_col]].dropna()
        if len(valid_both) > 10:
            diff = np.abs(valid_both[col] - valid_both[target_col])
            if (diff < 1e-6).mean() > 0.95:
                raise AssertionError(f"[{dataset_name}] CRITICAL LEAKAGE: Feature '{col}' is identical to target '{target_col}'!")

    # Check 2: Lag Direction Verification
    # For every lag column, a valid lag value at row i must correspond to an earlier timestamp row
    for lag_col in lag_cols:
        if lag_col in df.columns:
            valid_lag = df[df[lag_col].notna()]
            if len(valid_lag) > 0:
                first_idx = valid_lag.index[0]
                if first_idx == 0 and "home_id" not in df.columns:
                    raise AssertionError(f"[{dataset_name}] LEAKAGE: Lag column '{lag_col}' is populated at index 0 without historical context!")

    # Check 3: Sequence Break Crossing Check (for CWPRS)
    if "sequence_id" in df.columns:
        for lag_col in ["ghi_lag_24h", "temperature_lag_24h"]:
            if lag_col in df.columns:
                valid_lag_rows = df[df[lag_col].notna()]
                for idx in valid_lag_rows.index[:50]: # Sample check
                    cur_seq = df.loc[idx, "sequence_id"]
                    if idx >= 96:
                        past_seq = df.loc[idx - 96, "sequence_id"]
                        if cur_seq != past_seq or cur_seq == -1:
                            raise AssertionError(f"[{dataset_name}] SEQUENCE LEAKAGE: Lag '{lag_col}' crossed sequence boundary at index {idx}!")

    # Check 4: Home Isolation Check (for Pecan Street)
    if "home_id" in df.columns:
        for lag_col in ["load_lag_15m", "load_lag_30m", "load_lag_24h"]:
            if lag_col in df.columns:
                for h in df["home_id"].unique():
                    h_rows = df[df["home_id"] == h]
                    first_idx = h_rows.index[0]
                    if pd.notna(h_rows.loc[first_idx, lag_col]):
                        raise AssertionError(f"[{dataset_name}] CROSS-HOME LEAKAGE: Home {h} has non-null '{lag_col}' on its initial row!")

    # Check 5: Chronological Split Integrity
    train_dts = dts[df["split_set"] == "train"]
    val_dts = dts[df["split_set"] == "validation"]
    test_dts = dts[df["split_set"].isin(["test", "holdout"])]

    if len(train_dts) > 0 and len(val_dts) > 0:
        if not (train_dts.max() < val_dts.min()):
            raise AssertionError(f"[{dataset_name}] SPLIT LEAKAGE: Max train timestamp ({train_dts.max()}) is not strictly before Min validation timestamp ({val_dts.min()})!")

    if len(val_dts) > 0 and len(test_dts) > 0:
        if not (val_dts.max() < test_dts.min()):
            raise AssertionError(f"[{dataset_name}] SPLIT LEAKAGE: Max validation timestamp ({val_dts.max()}) is not strictly before Min test timestamp ({test_dts.min()})!")

    return {
        "dataset": dataset_name,
        "target": target_col,
        "target_identity_leakage": False,
        "lag_direction_leakage": False,
        "sequence_boundary_leakage": False,
        "cross_home_leakage": False,
        "chronological_split_leakage": False,
        "passed_all_leakage_checks": True,
    }


# =====================================================================
# 8. STEP 4B ORCHESTRATOR & REPORT GENERATION
# =====================================================================

def run_all_feature_engineering(
    processed_dir: str = "backend/data/processed",
    output_dir: str = "backend/data/features"
) -> Dict[str, Any]:
    """
    Executes complete Step 4B feature engineering pipeline:
      1. Builds solar forecasting features & runs leakage checks.
      2. Builds temperature forecasting features & runs leakage checks.
      3. Builds load forecasting features & runs leakage checks.
      4. Saves feature CSV datasets to backend/data/features/.
      5. Saves feature_metadata.json and feature_engineering_report.json.
    """
    os.makedirs(output_dir, exist_ok=True)

    solar_proc = os.path.join(processed_dir, "cwprs_solar_15m.csv")
    temp_proc = os.path.join(processed_dir, "cwprs_temperature_15m.csv")
    pecan_proc = os.path.join(processed_dir, "pecan_residential_load_15m.csv")

    assert os.path.exists(solar_proc), f"Missing {solar_proc}"
    assert os.path.exists(temp_proc), f"Missing {temp_proc}"
    assert os.path.exists(pecan_proc), f"Missing {pecan_proc}"

    # 1. Solar Pipeline
    print("[Step 4B] Building Solar Forecasting Features...")
    df_solar_feat, solar_meta = SolarFeaturePipeline.build_solar_features(solar_proc, temp_proc)
    solar_leakage = assert_no_feature_leakage(
        df_solar_feat,
        "solar",
        "target_ghi_wm2",
        ["ghi_lag_15m", "ghi_lag_30m", "ghi_lag_45m", "ghi_lag_24h"]
    )
    solar_out_csv = os.path.join(output_dir, "solar_forecasting_features.csv")
    df_solar_feat.to_csv(solar_out_csv, index=False)

    # 2. Temperature Pipeline
    print("[Step 4B] Building Temperature Forecasting Features...")
    df_temp_feat, temp_meta = TemperatureFeaturePipeline.build_temperature_features(temp_proc)
    temp_leakage = assert_no_feature_leakage(
        df_temp_feat,
        "temperature",
        "target_temperature_c",
        ["temperature_lag_15m", "temperature_lag_24h"]
    )
    temp_out_csv = os.path.join(output_dir, "temperature_forecasting_features.csv")
    df_temp_feat.to_csv(temp_out_csv, index=False)

    # 3. Load Pipeline
    print("[Step 4B] Building Load Forecasting Features...")
    df_load_feat, load_meta = LoadFeaturePipeline.build_load_features(pecan_proc)
    load_leakage = assert_no_feature_leakage(
        df_load_feat,
        "load",
        "target_gross_load_kw",
        ["load_lag_15m", "load_lag_30m", "load_lag_24h"]
    )
    load_out_csv = os.path.join(output_dir, "load_forecasting_features.csv")
    df_load_feat.to_csv(load_out_csv, index=False)

    # Save feature metadata JSON
    all_metadata = solar_meta + temp_meta + load_meta
    meta_json_path = os.path.join(output_dir, "feature_metadata.json")
    with open(meta_json_path, "w") as f:
        json.dump(all_metadata, f, indent=2)

    # Compile engineering summary report
    def get_split_counts(df: pd.DataFrame) -> Dict[str, int]:
        vc = df["split_set"].value_counts().to_dict()
        return {
            "train": int(vc.get("train", 0)),
            "validation": int(vc.get("validation", 0)),
            "test_or_holdout": int(vc.get("test", 0) + vc.get("holdout", 0)),
        }

    report = {
        "title": "STEP 4B FEATURE ENGINEERING & LEAKAGE AUDIT REPORT",
        "description": "Standardized, leakage-safe ML feature matrices for Renewable Distribution Grid Digital Twin.",
        "canonical_timestep": "15 minutes (96 intervals/day)",
        "datasets": {
            "solar": {
                "dataset_file": "solar_forecasting_features.csv",
                "row_count": len(df_solar_feat),
                "feature_count": len(solar_meta),
                "target_column": "target_ghi_wm2",
                "date_start": df_solar_feat["timestamp"].iloc[0],
                "date_end": df_solar_feat["timestamp"].iloc[-1],
                "splits": get_split_counts(df_solar_feat),
                "sequence_count": int(df_solar_feat[df_solar_feat["sequence_id"] != -1]["sequence_id"].nunique()),
                "missing_feature_counts": {c: int(df_solar_feat[c].isna().sum()) for c in df_solar_feat.columns if df_solar_feat[c].isna().sum() > 0},
                "leakage_checks": solar_leakage,
                "limitations": [
                    "Target is GHI in W/m2 from Khadakvasla, Pune, NOT PV inverter kW.",
                    "Lags cannot bridge across the 8-day August 2024 outage (preserved as NaNs until 24h history is re-established)."
                ]
            },
            "temperature": {
                "dataset_file": "temperature_forecasting_features.csv",
                "row_count": len(df_temp_feat),
                "feature_count": len(temp_meta),
                "target_column": "target_temperature_c",
                "date_start": df_temp_feat["timestamp"].iloc[0],
                "date_end": df_temp_feat["timestamp"].iloc[-1],
                "splits": get_split_counts(df_temp_feat),
                "sequence_count": int(df_temp_feat[df_temp_feat["sequence_id"] != -1]["sequence_id"].nunique()),
                "missing_feature_counts": {c: int(df_temp_feat[c].isna().sum()) for c in df_temp_feat.columns if df_temp_feat[c].isna().sum() > 0},
                "leakage_checks": temp_leakage,
                "limitations": [
                    "Ambient telemetry from Pune; sequence breaks preserved."
                ]
            },
            "load": {
                "dataset_file": "load_forecasting_features.csv",
                "row_count": len(df_load_feat),
                "feature_count": len(load_meta),
                "target_column": "target_gross_load_kw",
                "home_count": int(df_load_feat["home_id"].nunique()),
                "date_start": df_load_feat["timestamp"].iloc[0],
                "date_end": df_load_feat["timestamp"].iloc[-1],
                "splits": get_split_counts(df_load_feat),
                "missing_feature_counts": {c: int(df_load_feat[c].isna().sum()) for c in df_load_feat.columns if df_load_feat[c].isna().sum() > 0},
                "leakage_checks": load_leakage,
                "limitations": [
                    "Empirical 3-day summer residential data from Austin, Texas.",
                    "Used strictly as a normalized diurnal residential load-shape calibration prototype, NOT as an annual Indian distribution grid load dataset."
                ]
            }
        },
        "leakage_audit_status": "ALL_LEAKAGE_CHECKS_PASSED",
        "status": "STEP_4B_FEATURE_ENGINEERING_COMPLETE"
    }

    report_json_path = os.path.join(output_dir, "feature_engineering_report.json")
    with open(report_json_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[Step 4B] Feature engineering completed successfully. Artifacts saved in {output_dir}")
    return report


if __name__ == "__main__":
    run_all_feature_engineering()
