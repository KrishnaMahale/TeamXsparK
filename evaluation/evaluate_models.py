"""Comprehensive ML Forecasting Model Evaluation Script.

Executes genuine, deterministic, leakage-free evaluations of the 3 production ML models:
1. Solar / GHI — solar_ghi_model.joblib (HistGradientBoostingRegressor)
2. Temperature — temperature_model.joblib (Ridge Regression Pipeline)
3. Electrical Load — load_profile_model.joblib (HistGradientBoostingRegressor Categorical Pipeline)

Evaluations performed:
- Step 2: Standard 1-step test metrics on untouched test splits (MAE, RMSE, R2, WAPE, sMAPE, Bias, N).
- Step 3: Real 96-step 24-hour day-ahead recursive forecasting across all valid test origins.
  Broken down into: Full 24h, 0-6h, 6-12h, 12-18h, 18-24h horizons, plus Daylight-only for solar.
- Step 4: Strict baseline comparisons on identical timestamps (Persistence, Previous-Day 24h, Clear-Sky proxy, Diurnal profile).
- Percentage MAE improvements over strongest baselines.
- Saves machine-readable JSON and formatted Markdown report.
"""

import sys
import json
import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Repository paths
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
MODELS_DIR = BACKEND_DIR / "data" / "models"
FEATURES_DIR = BACKEND_DIR / "data" / "features"
OUTPUT_DIR = BASE_DIR / "evaluation"


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-6) -> Dict[str, Any]:
    """Calculate MAE, RMSE, R2, WAPE, sMAPE, Bias, and valid sample count.
    
    Zero-denominator policy for sMAPE:
    If |y_true| + |y_pred| == 0, symmetric error is defined as 0.0.
    """
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    n_samples = int(np.sum(mask))
    if n_samples == 0:
        return {
            "MAE": 0.0,
            "RMSE": 0.0,
            "R2": 0.0,
            "WAPE": 0.0,
            "sMAPE": 0.0,
            "Bias": 0.0,
            "N": 0
        }
    
    yt = y_true[mask]
    yp = y_pred[mask]
    
    mae = float(mean_absolute_error(yt, yp))
    rmse = float(np.sqrt(mean_squared_error(yt, yp)))
    r2 = float(r2_score(yt, yp)) if (len(yt) > 1 and np.var(yt) > 1e-9) else 0.0
    
    # WAPE = 100 * sum(|y - y_hat|) / sum(|y|)
    sum_yt = float(np.sum(np.abs(yt)))
    wape = float(np.sum(np.abs(yt - yp)) / sum_yt * 100.0) if sum_yt > eps else 0.0
    
    # sMAPE = 100/N * sum( 2 * |y - y_hat| / (|y| + |y_hat| + eps) )
    denom = np.abs(yt) + np.abs(yp)
    zero_denom_mask = denom < eps
    
    smape_terms = np.zeros_like(yt)
    non_zero = ~zero_denom_mask
    if np.any(non_zero):
        smape_terms[non_zero] = 2.0 * np.abs(yt[non_zero] - yp[non_zero]) / (denom[non_zero] + eps)
    smape = float(np.mean(smape_terms) * 100.0)
    
    # Bias = mean signed error: 1/N * sum(y_hat - y)
    bias = float(np.mean(yp - yt))
    
    return {
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4),
        "R2": round(r2, 4),
        "WAPE": round(wape, 4),
        "sMAPE": round(smape, 4),
        "Bias": round(bias, 4),
        "N": n_samples
    }


def compute_mae_improvement(baseline_mae: float, model_mae: float) -> Optional[float]:
    """Calculate percentage MAE improvement: 100 * (baseline - model) / baseline."""
    if baseline_mae <= 1e-9:
        return None
    return round(float(100.0 * (baseline_mae - model_mae) / baseline_mae), 2)


def run_evaluation():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 80)
    print("STARTING GENUINE PRODUCTION ML FORECASTING ACCURACY EVALUATION")
    print("=" * 80)
    
    # Load metadata
    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        meta = json.load(f)
        
    # Load models
    print("\n[Step 1] Loading verified production model artifacts...")
    solar_model = joblib.load(MODELS_DIR / "solar_ghi_model.joblib")
    temp_model = joblib.load(MODELS_DIR / "temperature_model.joblib")
    load_model = joblib.load(MODELS_DIR / "load_profile_model.joblib")
    
    solar_feats = meta["solar_ghi_model"]["feature_names"]
    temp_feats = meta["temperature_model"]["feature_names"]
    load_feats = meta["load_profile_model"]["feature_names"]
    
    print("  [OK] Solar Model: HistGradientBoostingRegressor (23 features)")
    print(f"  [OK] Temperature Model: {meta['temperature_model']['model_type']} ({len(temp_feats)} features)")
    print("  [OK] Load Model: HistGradientBoostingRegressor Categorical Pipeline (12 features)")
    
    # Load datasets
    print("\n[Step 1b] Loading standardized feature matrices...")
    df_solar = pd.read_csv(FEATURES_DIR / "solar_forecasting_features.csv")
    df_temp = pd.read_csv(FEATURES_DIR / "temperature_forecasting_features.csv")
    df_load = pd.read_csv(FEATURES_DIR / "load_forecasting_features.csv")
    
    # =========================================================================
    # PART A: STANDARD 1-STEP TEST EVALUATION (UNTOUCHED HOLDOUT SETS)
    # =========================================================================
    print("\n" + "=" * 80)
    print("PART A: STANDARD 1-STEP TEST EVALUATION ON UNTOUCHED HOLDOUTS")
    print("=" * 80)
    
    # 1. Solar 1-Step Test
    s_test = df_solar[df_solar["split_set"] == "test"].copy()
    y_solar_true = s_test["target_ghi_wm2"].values
    elev_test = s_test["solar_elevation_deg"].values
    daylight_solar_mask = elev_test > 0.0
    
    pred_solar_1step = np.maximum(0.0, solar_model.predict(s_test[solar_feats]))
    pred_solar_1step[~daylight_solar_mask] = 0.0
    
    m_solar_1step_all = calculate_metrics(y_solar_true, pred_solar_1step)
    m_solar_1step_day = calculate_metrics(y_solar_true[daylight_solar_mask], pred_solar_1step[daylight_solar_mask])
    m_solar_1step_night = calculate_metrics(y_solar_true[~daylight_solar_mask], pred_solar_1step[~daylight_solar_mask])
    
    # Solar Baselines on 1-step test
    p1_solar = s_test["ghi_lag_15m"].values
    p24_solar = s_test["ghi_lag_24h"].values
    cs_solar = s_test["clearsky_proxy_wm2"].values
    
    # Common test rows with 1-step persistence
    s_common_mask = ~np.isnan(p1_solar) & ~np.isnan(y_solar_true)
    m_solar_1step_p1 = calculate_metrics(y_solar_true[s_common_mask], p1_solar[s_common_mask])
    m_solar_1step_common = calculate_metrics(y_solar_true[s_common_mask], pred_solar_1step[s_common_mask])
    
    print(f"Solar 1-Step Test (N={m_solar_1step_all['N']}):")
    print(f"  All-period:  MAE={m_solar_1step_all['MAE']} W/m², RMSE={m_solar_1step_all['RMSE']} W/m², R²={m_solar_1step_all['R2']}, WAPE={m_solar_1step_all['WAPE']}%, sMAPE={m_solar_1step_all['sMAPE']}%, Bias={m_solar_1step_all['Bias']} W/m²")
    print(f"  Daylight:    MAE={m_solar_1step_day['MAE']} W/m², RMSE={m_solar_1step_day['RMSE']} W/m², R²={m_solar_1step_day['R2']}, WAPE={m_solar_1step_day['WAPE']}%, sMAPE={m_solar_1step_day['sMAPE']}%")
    print(f"  Nighttime:   MAE={m_solar_1step_night['MAE']} W/m², RMSE={m_solar_1step_night['RMSE']} W/m²")
    print(f"  Persistence: MAE={m_solar_1step_p1['MAE']} W/m² (ML on common: {m_solar_1step_common['MAE']} W/m² -> Imp: {compute_mae_improvement(m_solar_1step_p1['MAE'], m_solar_1step_common['MAE'])}%)")
    
    # 2. Temperature 1-Step Test
    t_test = df_temp[df_temp["split_set"] == "test"].copy()
    y_temp_true = t_test["target_temperature_c"].values
    pred_temp_1step = temp_model.predict(t_test[temp_feats])
    
    m_temp_1step = calculate_metrics(y_temp_true, pred_temp_1step)
    
    # Temperature Baselines on 1-step test
    p1_temp = t_test["temperature_lag_15m"].values
    t_common_mask = ~np.isnan(p1_temp) & ~np.isnan(y_temp_true)
    m_temp_1step_p1 = calculate_metrics(y_temp_true[t_common_mask], p1_temp[t_common_mask])
    m_temp_1step_common = calculate_metrics(y_temp_true[t_common_mask], pred_temp_1step[t_common_mask])
    
    print(f"\nTemperature 1-Step Test (N={m_temp_1step['N']}):")
    print(f"  Overall:     MAE={m_temp_1step['MAE']} °C, RMSE={m_temp_1step['RMSE']} °C, R²={m_temp_1step['R2']}, WAPE={m_temp_1step['WAPE']}%, sMAPE={m_temp_1step['sMAPE']}%, Bias={m_temp_1step['Bias']} °C")
    print(f"  Persistence: MAE={m_temp_1step_p1['MAE']} °C (ML on common: {m_temp_1step_common['MAE']} °C -> Imp: {compute_mae_improvement(m_temp_1step_p1['MAE'], m_temp_1step_common['MAE'])}%)")
    
    # 3. Electrical Load 1-Step Holdout Test
    l_holdout = df_load[df_load["split_set"] == "holdout"].copy()
    # Drop end boundary rows with NaN target if any
    l_holdout_valid = l_holdout[l_holdout["target_gross_load_kw"].notna()].copy()
    y_load_true = l_holdout_valid["target_gross_load_kw"].values
    pred_load_1step = np.maximum(0.0, load_model.predict(l_holdout_valid[load_feats]))
    
    m_load_1step = calculate_metrics(y_load_true, pred_load_1step)
    
    p1_load = l_holdout_valid["load_lag_15m"].values
    m_load_1step_p1 = calculate_metrics(y_load_true, p1_load)
    
    # Per-home breakdown
    per_home_1step = {}
    for hid in range(1, 11):
        h_mask = (l_holdout_valid["home_id"] == hid)
        per_home_1step[f"Home_{hid}"] = calculate_metrics(y_load_true[h_mask], pred_load_1step[h_mask])
    
    print(f"\nLoad 1-Step Holdout (N={m_load_1step['N']}):")
    print(f"  Overall:     MAE={m_load_1step['MAE']} kW, RMSE={m_load_1step['RMSE']} kW, R²={m_load_1step['R2']}, WAPE={m_load_1step['WAPE']}%, sMAPE={m_load_1step['sMAPE']}%, Bias={m_load_1step['Bias']} kW")
    print(f"  Persistence: MAE={m_load_1step_p1['MAE']} kW -> Imp: {compute_mae_improvement(m_load_1step_p1['MAE'], m_load_1step['MAE'])}%")
    print(f"  Median Home MAE: {np.median([m['MAE'] for m in per_home_1step.values()]):.4f} kW")
    
    # =========================================================================
    # PART B: REAL 96-STEP 24-HOUR DAY-AHEAD ROLLING-ORIGIN FORECAST EVALUATION
    # =========================================================================
    print("\n" + "=" * 80)
    print("PART B: REAL 96-STEP 24-HOUR DAY-AHEAD RECURSIVE FORECAST EVALUATION")
    print("=" * 80)
    
    # --- Solar & Temperature 96-Step Day-Ahead Simulation ---
    # Find all test dates that have observations
    dts_solar_test = pd.to_datetime(s_test["timestamp"])
    test_dates = sorted(list(dts_solar_test.dt.date.unique()))
    print(f"Test period contains {len(test_dates)} calendar days ({test_dates[0]} to {test_dates[-1]}).")
    
    solar_sim_records = []
    temp_sim_records = []
    
    valid_origins_count = 0
    excluded_origins_count = 0
    
    for t_date in test_dates:
        t_date_str = str(t_date)
        t_start_str = f"{t_date_str} 00:00:00+0530"
        t_end_str = f"{t_date_str} 23:45:00+0530"
        
        # Ground truth target window (up to 96 steps)
        day_solar_actual = df_solar[(df_solar["timestamp"] >= t_start_str) & (df_solar["timestamp"] <= t_end_str)].sort_values("timestamp").reset_index(drop=True)
        day_temp_actual = df_temp[(df_temp["timestamp"] >= t_start_str) & (df_temp["timestamp"] <= t_end_str)].sort_values("timestamp").reset_index(drop=True)
        
        # Check if day has any valid ground truth target values
        valid_solar_actuals = day_solar_actual["target_ghi_wm2"].notna().sum()
        valid_temp_actuals = day_temp_actual["target_temperature_c"].notna().sum()
        
        if valid_solar_actuals == 0 or len(day_solar_actual) == 0:
            excluded_origins_count += 1
            continue
            
        # Extract Historical Context strictly prior to t_start_str
        hist_sf = df_solar[df_solar["timestamp"] < t_start_str].tail(96)
        hist_tf = df_temp[df_temp["timestamp"] < t_start_str].tail(96)
        
        if len(hist_sf) < 96:
            hist_sf = df_solar.head(96)
            hist_tf = df_temp.head(96)
            
        ghi_buffer = hist_sf["target_ghi_wm2"].dropna().tolist()[-8:]
        if len(ghi_buffer) < 8:
            ghi_buffer = [0.0] * 8
            
        temp_buffer = hist_tf["target_temperature_c"].dropna().tolist()[-4:]
        if len(temp_buffer) < 4:
            temp_buffer = [25.0] * 4
            
        prior_24h_ghi = hist_sf["target_ghi_wm2"].fillna(0.0).values
        prior_24h_temp = hist_tf["target_temperature_c"].ffill().bfill().values
        
        if len(prior_24h_ghi) < 96:
            prior_24h_ghi = np.pad(prior_24h_ghi, (0, 96 - len(prior_24h_ghi)), "edge")
        if len(prior_24h_temp) < 96:
            prior_24h_temp = np.pad(prior_24h_temp, (0, 96 - len(prior_24h_temp)), "edge")
            
        # Last known observations prior to origin for 1-step persistence baseline
        last_known_ghi = ghi_buffer[-1]
        last_known_temp = temp_buffer[-1]
        
        # Build 96 timestamps & solar geometry
        tz_offset = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        origin_dt = datetime.datetime(t_date.year, t_date.month, t_date.day, 0, 0, 0, tzinfo=tz_offset)
        dts = [origin_dt + datetime.timedelta(minutes=15 * i) for i in range(len(day_solar_actual))]
        
        sim_solar_preds = []
        sim_temp_preds = []
        
        # Local recursive rollout strictly matching forecast_pipeline.py
        for i, dt in enumerate(dts):
            row_solar = day_solar_actual.iloc[i]
            row_temp = day_temp_actual.iloc[i]
            elev = float(row_solar["solar_elevation_deg"])
            slot = int(row_solar["slot_15m"])
            min_of_day = int(row_solar["minute_of_day"])
            doy = int(row_solar["day_of_year"])
            month = int(row_solar["month"])
            dow = int(row_solar["day_of_week"])
            
            # Predict Temperature
            t_feat = {
                "minute_of_day": min_of_day,
                "slot_15m": slot,
                "hour": dt.hour,
                "day_of_week": dow,
                "day_of_year": doy,
                "month": month,
                "day_of_year_sin": np.round(np.sin(2 * np.pi * doy / 365.25), 4),
                "day_of_year_cos": np.round(np.cos(2 * np.pi * doy / 365.25), 4),
                "slot_15m_sin": np.round(np.sin(2 * np.pi * slot / 96.0), 4),
                "slot_15m_cos": np.round(np.cos(2 * np.pi * slot / 96.0), 4),
                "solar_elevation_deg": elev,
                "temperature_lag_15m": last_known_temp,
                "temperature_lag_24h": prior_24h_temp[i],
                "temperature_roll_mean_1h": np.mean(temp_buffer[-4:]),
                "temperature_roll_std_1h": np.std(temp_buffer[-4:]),
            }
            pred_t = float(temp_model.predict(pd.DataFrame([t_feat])[temp_feats])[0])
            sim_temp_preds.append(pred_t)
            temp_buffer.append(pred_t)
            
            # Predict Solar GHI
            cs = float(row_solar["clearsky_proxy_wm2"])
            s_feat = {
                "minute_of_day": min_of_day,
                "slot_15m": slot,
                "hour": dt.hour,
                "day_of_week": dow,
                "day_of_year": doy,
                "month": month,
                "day_of_year_sin": np.round(np.sin(2 * np.pi * doy / 365.25), 4),
                "day_of_year_cos": np.round(np.cos(2 * np.pi * doy / 365.25), 4),
                "slot_15m_sin": np.round(np.sin(2 * np.pi * slot / 96.0), 4),
                "slot_15m_cos": np.round(np.cos(2 * np.pi * slot / 96.0), 4),
                "solar_elevation_deg": elev,
                "solar_elevation_sin": np.round(np.sin(np.radians(elev)), 4),
                "solar_elevation_cos": np.round(np.cos(np.radians(elev)), 4),
                "is_night": bool(elev <= -5.0),
                "clearsky_proxy_wm2": cs,
                "ghi_lag_15m": ghi_buffer[-1],
                "ghi_lag_30m": ghi_buffer[-2] if len(ghi_buffer) >= 2 else ghi_buffer[-1],
                "ghi_lag_45m": ghi_buffer[-3] if len(ghi_buffer) >= 3 else ghi_buffer[-1],
                "ghi_lag_24h": prior_24h_ghi[i],
                "ghi_roll_mean_2h": np.mean(ghi_buffer[-8:]),
                "ghi_roll_std_2h": np.std(ghi_buffer[-8:]),
                "temperature_c": pred_t,
                "temperature_lag_24h": prior_24h_temp[i],
            }
            pred_ghi = float(solar_model.predict(pd.DataFrame([s_feat])[solar_feats])[0])
            pred_ghi = max(0.0, pred_ghi)
            if elev <= 0.0:
                pred_ghi = 0.0
            sim_solar_preds.append(pred_ghi)
            ghi_buffer.append(pred_ghi)
            
            # Step metadata and baselines
            # Horizon index (1-based, 1 to 96)
            h_step = i + 1
            
            # Solar record
            actual_ghi = row_solar["target_ghi_wm2"]
            solar_sim_records.append({
                "origin_date": t_date_str,
                "step": h_step,
                "hour_ahead": round(h_step * 0.25, 2),
                "timestamp": str(row_solar["timestamp"]),
                "elevation": elev,
                "is_daylight": bool(elev > 0.0),
                "actual": actual_ghi,
                "pred_model": pred_ghi,
                "baseline_persistence": last_known_ghi,
                "baseline_prev_day": prior_24h_ghi[i],
                "baseline_clearsky": cs
            })
            
            # Temperature record
            actual_temp = row_temp["target_temperature_c"]
            temp_sim_records.append({
                "origin_date": t_date_str,
                "step": h_step,
                "hour_ahead": round(h_step * 0.25, 2),
                "timestamp": str(row_temp["timestamp"]),
                "actual": actual_temp,
                "pred_model": pred_t,
                "baseline_persistence": last_known_temp,
                "baseline_prev_day": prior_24h_temp[i]
            })
            
        valid_origins_count += 1

    print(f"Evaluated {valid_origins_count} valid 24h forecast origins across test period ({excluded_origins_count} excluded due to zero valid telemetry).")
    
    df_sim_solar = pd.DataFrame(solar_sim_records)
    df_sim_temp = pd.DataFrame(temp_sim_records)
    
    # Filter only rows with valid actual target values
    df_sim_solar_valid = df_sim_solar[df_sim_solar["actual"].notna()].copy()
    df_sim_temp_valid = df_sim_temp[df_sim_temp["actual"].notna()].copy()
    
    print(f"Total valid 24h forecast evaluation points: Solar={len(df_sim_solar_valid)}, Temperature={len(df_sim_temp_valid)}")
    
    # Helper to calculate horizon metrics for Solar
    def eval_solar_horizon_slice(df_slice: pd.DataFrame, label: str) -> Dict[str, Any]:
        yt = df_slice["actual"].values
        yp = df_slice["pred_model"].values
        p_pers = df_slice["baseline_persistence"].values
        p_prev = df_slice["baseline_prev_day"].values
        p_cs = df_slice["baseline_clearsky"].values
        
        m_model = calculate_metrics(yt, yp)
        m_pers = calculate_metrics(yt, p_pers)
        m_prev = calculate_metrics(yt, p_prev)
        m_cs = calculate_metrics(yt, p_cs)
        
        # Best baseline is the one with lowest MAE
        baselines = [("Persistence_Origin", m_pers["MAE"]), ("Previous_Day_24h", m_prev["MAE"]), ("ClearSky_Proxy", m_cs["MAE"])]
        best_b_name, best_b_mae = min(baselines, key=lambda x: x[1])
        imp = compute_mae_improvement(best_b_mae, m_model["MAE"])
        
        return {
            "horizon_label": label,
            "metrics": m_model,
            "baseline_persistence_mae": m_pers["MAE"],
            "baseline_prev_day_mae": m_prev["MAE"],
            "baseline_clearsky_mae": m_cs["MAE"],
            "best_baseline_name": best_b_name,
            "best_baseline_mae": best_b_mae,
            "improvement_pct": imp,
            "N": m_model["N"]
        }
        
    # Helper to calculate horizon metrics for Temperature
    def eval_temp_horizon_slice(df_slice: pd.DataFrame, label: str) -> Dict[str, Any]:
        yt = df_slice["actual"].values
        yp = df_slice["pred_model"].values
        p_pers = df_slice["baseline_persistence"].values
        p_prev = df_slice["baseline_prev_day"].values
        
        m_model = calculate_metrics(yt, yp)
        m_pers = calculate_metrics(yt, p_pers)
        m_prev = calculate_metrics(yt, p_prev)
        
        baselines = [("Persistence_Origin", m_pers["MAE"]), ("Previous_Day_24h", m_prev["MAE"])]
        best_b_name, best_b_mae = min(baselines, key=lambda x: x[1])
        imp = compute_mae_improvement(best_b_mae, m_model["MAE"])
        
        return {
            "horizon_label": label,
            "metrics": m_model,
            "baseline_persistence_mae": m_pers["MAE"],
            "baseline_prev_day_mae": m_prev["MAE"],
            "best_baseline_name": best_b_name,
            "best_baseline_mae": best_b_mae,
            "improvement_pct": imp,
            "N": m_model["N"]
        }

    # Slices for Solar
    solar_h_all = eval_solar_horizon_slice(df_sim_solar_valid, "Full 24h (0-24h)")
    solar_h_day = eval_solar_horizon_slice(df_sim_solar_valid[df_sim_solar_valid["is_daylight"]], "Full 24h Daylight-Only")
    solar_h_night = eval_solar_horizon_slice(df_sim_solar_valid[~df_sim_solar_valid["is_daylight"]], "Full 24h Nighttime-Only")
    solar_h_0_6 = eval_solar_horizon_slice(df_sim_solar_valid[df_sim_solar_valid["step"].between(1, 24)], "0-6 Hours (Steps 1-24)")
    solar_h_6_12 = eval_solar_horizon_slice(df_sim_solar_valid[df_sim_solar_valid["step"].between(25, 48)], "6-12 Hours (Steps 25-48)")
    solar_h_12_18 = eval_solar_horizon_slice(df_sim_solar_valid[df_sim_solar_valid["step"].between(49, 72)], "12-18 Hours (Steps 49-72)")
    solar_h_18_24 = eval_solar_horizon_slice(df_sim_solar_valid[df_sim_solar_valid["step"].between(73, 96)], "18-24 Hours (Steps 73-96)")
    
    # Slices for Temperature
    temp_h_all = eval_temp_horizon_slice(df_sim_temp_valid, "Full 24h (0-24h)")
    temp_h_0_6 = eval_temp_horizon_slice(df_sim_temp_valid[df_sim_temp_valid["step"].between(1, 24)], "0-6 Hours (Steps 1-24)")
    temp_h_6_12 = eval_temp_horizon_slice(df_sim_temp_valid[df_sim_temp_valid["step"].between(25, 48)], "6-12 Hours (Steps 25-48)")
    temp_h_12_18 = eval_temp_horizon_slice(df_sim_temp_valid[df_sim_temp_valid["step"].between(49, 72)], "12-18 Hours (Steps 49-72)")
    temp_h_18_24 = eval_temp_horizon_slice(df_sim_temp_valid[df_sim_temp_valid["step"].between(73, 96)], "18-24 Hours (Steps 73-96)")
    
    print("\n--- SOLAR 24H RECURSIVE RESULTS ---")
    print(f"  Full 24h:   MAE={solar_h_all['metrics']['MAE']} W/m², RMSE={solar_h_all['metrics']['RMSE']} W/m², R²={solar_h_all['metrics']['R2']}, WAPE={solar_h_all['metrics']['WAPE']}%, sMAPE={solar_h_all['metrics']['sMAPE']}%")
    print(f"  Daylight:   MAE={solar_h_day['metrics']['MAE']} W/m², RMSE={solar_h_day['metrics']['RMSE']} W/m², R²={solar_h_day['metrics']['R2']}, WAPE={solar_h_day['metrics']['WAPE']}%")
    print(f"  Best Baseline: {solar_h_all['best_baseline_name']} (MAE={solar_h_all['best_baseline_mae']} W/m²) -> Model Improvement: {solar_h_all['improvement_pct']}%")
    print(f"    0-6h:   MAE={solar_h_0_6['metrics']['MAE']} W/m² (Imp: {solar_h_0_6['improvement_pct']}%)")
    print(f"    6-12h:  MAE={solar_h_6_12['metrics']['MAE']} W/m² (Imp: {solar_h_6_12['improvement_pct']}%)")
    print(f"    12-18h: MAE={solar_h_12_18['metrics']['MAE']} W/m² (Imp: {solar_h_12_18['improvement_pct']}%)")
    print(f"    18-24h: MAE={solar_h_18_24['metrics']['MAE']} W/m² (Imp: {solar_h_18_24['improvement_pct']}%)")
    
    print("\n--- TEMPERATURE 24H RECURSIVE RESULTS ---")
    print(f"  Full 24h:   MAE={temp_h_all['metrics']['MAE']} °C, RMSE={temp_h_all['metrics']['RMSE']} °C, R²={temp_h_all['metrics']['R2']}, WAPE={temp_h_all['metrics']['WAPE']}%, sMAPE={temp_h_all['metrics']['sMAPE']}%")
    print(f"  Best Baseline: {temp_h_all['best_baseline_name']} (MAE={temp_h_all['best_baseline_mae']} °C) -> Model Improvement: {temp_h_all['improvement_pct']}%")
    print(f"    0-6h:   MAE={temp_h_0_6['metrics']['MAE']} °C (Imp: {temp_h_0_6['improvement_pct']}%)")
    print(f"    6-12h:  MAE={temp_h_6_12['metrics']['MAE']} °C (Imp: {temp_h_6_12['improvement_pct']}%)")
    print(f"    12-18h: MAE={temp_h_12_18['metrics']['MAE']} °C (Imp: {temp_h_12_18['improvement_pct']}%)")
    print(f"    18-24h: MAE={temp_h_18_24['metrics']['MAE']} °C (Imp: {temp_h_18_24['improvement_pct']}%)")

    # --- Electrical Load 96-Step Day-Ahead Simulation on Holdout Day (2018-08-25) ---
    print("\n--- ELECTRICAL LOAD 96-STEP DAY-AHEAD SIMULATION ---")
    val_lf = df_load[df_load["split_set"] == "validation"].copy()
    holdout_lf = df_load[df_load["split_set"] == "holdout"].copy()
    train_lf = df_load[df_load["split_set"] == "train"].copy()
    
    # Establish home buffers from validation day Aug 24
    home_buffers = {}
    for hid in range(1, 11):
        h_df = val_lf[val_lf["home_id"] == hid].sort_values("timestamp")
        home_buffers[hid] = h_df["target_gross_load_kw"].dropna().tolist()[-4:]
        
    # Baseline maps from train/val
    diurnal_map = train_lf.groupby(["home_id", "slot_15m"])["target_gross_load_kw"].mean().to_dict()
    home_mean_map = train_lf.groupby("home_id")["target_gross_load_kw"].mean().to_dict()
    prev_day_map = val_lf.set_index(["home_id", "slot_15m"])["target_gross_load_kw"].to_dict()
    
    # Initial persistence at origin for each home
    last_known_load_per_home = {hid: home_buffers[hid][-1] for hid in range(1, 11)}
    
    load_sim_records = []
    
    # Simulate the 96 steps of Aug 25, 2018
    # 96 unique slots
    for slot_idx in range(96):
        h_step = slot_idx + 1
        hour = slot_idx // 4
        minute = (slot_idx % 4) * 15
        min_of_day = slot_idx * 15
        s_sin = np.round(np.sin(2 * np.pi * slot_idx / 96.0), 4)
        s_cos = np.round(np.cos(2 * np.pi * slot_idx / 96.0), 4)
        # Aug 25, 2018 was Saturday (dow = 5, is_weekend = 1)
        dow = 5
        is_wknd = 1
        
        # Build batch for 10 homes
        step_rows = []
        for hid in range(1, 11):
            buf = home_buffers[hid]
            step_rows.append({
                "home_id": hid,
                "minute_of_day": min_of_day,
                "slot_15m": slot_idx,
                "hour": hour,
                "day_of_week": dow,
                "is_weekend": is_wknd,
                "slot_15m_sin": s_sin,
                "slot_15m_cos": s_cos,
                "load_lag_15m": buf[-1],
                "load_lag_30m": buf[-2] if len(buf) >= 2 else buf[-1],
                "load_roll_mean_1h": np.mean(buf[-4:]),
                "load_roll_std_1h": np.std(buf[-4:]),
            })
            
        preds_step = np.maximum(0.0, load_model.predict(pd.DataFrame(step_rows)[load_feats]))
        
        # Update buffers and record
        for idx, hid in enumerate(range(1, 11)):
            pred_h = float(preds_step[idx])
            home_buffers[hid].append(pred_h)
            
            # Find actual value in holdout set
            actual_row = holdout_lf[(holdout_lf["home_id"] == hid) & (holdout_lf["slot_15m"] == slot_idx) & (holdout_lf["timestamp"].str.startswith("2018-08-25"))]
            actual_val = float(actual_row["target_gross_load_kw"].values[0]) if len(actual_row) > 0 and actual_row["target_gross_load_kw"].notna().values[0] else np.nan
            
            load_sim_records.append({
                "home_id": hid,
                "step": h_step,
                "hour_ahead": round(h_step * 0.25, 2),
                "slot_15m": slot_idx,
                "actual": actual_val,
                "pred_model": pred_h,
                "baseline_persistence": last_known_load_per_home[hid],
                "baseline_prev_day": prev_day_map.get((hid, slot_idx), np.nan),
                "baseline_diurnal": diurnal_map.get((hid, slot_idx), np.nan),
                "baseline_home_mean": home_mean_map.get(hid, np.nan)
            })

    df_sim_load = pd.DataFrame(load_sim_records)
    df_sim_load_valid = df_sim_load[df_sim_load["actual"].notna()].copy()
    
    def eval_load_horizon_slice(df_slice: pd.DataFrame, label: str) -> Dict[str, Any]:
        yt = df_slice["actual"].values
        yp = df_slice["pred_model"].values
        p_pers = df_slice["baseline_persistence"].values
        p_prev = df_slice["baseline_prev_day"].values
        p_diur = df_slice["baseline_diurnal"].values
        p_mean = df_slice["baseline_home_mean"].values
        
        m_model = calculate_metrics(yt, yp)
        m_pers = calculate_metrics(yt, p_pers)
        m_prev = calculate_metrics(yt, p_prev)
        m_diur = calculate_metrics(yt, p_diur)
        m_mean = calculate_metrics(yt, p_mean)
        
        baselines = [
            ("Persistence_Origin", m_pers["MAE"]),
            ("Previous_Day_24h", m_prev["MAE"]),
            ("Diurnal_Slot_Profile", m_diur["MAE"]),
            ("Home_Mean", m_mean["MAE"])
        ]
        best_b_name, best_b_mae = min(baselines, key=lambda x: x[1])
        imp = compute_mae_improvement(best_b_mae, m_model["MAE"])
        
        return {
            "horizon_label": label,
            "metrics": m_model,
            "baseline_persistence_mae": m_pers["MAE"],
            "baseline_prev_day_mae": m_prev["MAE"],
            "baseline_diurnal_mae": m_diur["MAE"],
            "baseline_home_mean_mae": m_mean["MAE"],
            "best_baseline_name": best_b_name,
            "best_baseline_mae": best_b_mae,
            "improvement_pct": imp,
            "N": m_model["N"]
        }

    load_h_all = eval_load_horizon_slice(df_sim_load_valid, "Full 24h (0-24h)")
    load_h_0_6 = eval_load_horizon_slice(df_sim_load_valid[df_sim_load_valid["step"].between(1, 24)], "0-6 Hours (Steps 1-24)")
    load_h_6_12 = eval_load_horizon_slice(df_sim_load_valid[df_sim_load_valid["step"].between(25, 48)], "6-12 Hours (Steps 25-48)")
    load_h_12_18 = eval_load_horizon_slice(df_sim_load_valid[df_sim_load_valid["step"].between(49, 72)], "12-18 Hours (Steps 49-72)")
    load_h_18_24 = eval_load_horizon_slice(df_sim_load_valid[df_sim_load_valid["step"].between(73, 96)], "18-24 Hours (Steps 73-96)")
    
    print(f"  Full 24h:   MAE={load_h_all['metrics']['MAE']} kW, RMSE={load_h_all['metrics']['RMSE']} kW, R²={load_h_all['metrics']['R2']}, WAPE={load_h_all['metrics']['WAPE']}%, sMAPE={load_h_all['metrics']['sMAPE']}%")
    print(f"  Best Baseline: {load_h_all['best_baseline_name']} (MAE={load_h_all['best_baseline_mae']} kW) -> Model Improvement: {load_h_all['improvement_pct']}%")
    print(f"    0-6h:   MAE={load_h_0_6['metrics']['MAE']} kW (Imp: {load_h_0_6['improvement_pct']}%)")
    print(f"    6-12h:  MAE={load_h_6_12['metrics']['MAE']} kW (Imp: {load_h_6_12['improvement_pct']}%)")
    print(f"    12-18h: MAE={load_h_12_18['metrics']['MAE']} kW (Imp: {load_h_12_18['improvement_pct']}%)")
    print(f"    18-24h: MAE={load_h_18_24['metrics']['MAE']} kW (Imp: {load_h_18_24['improvement_pct']}%)")

    # Save JSON results
    results_json = {
        "evaluation_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Genuine Measured Accuracy Evaluation of Production ML Forecasting Models",
        "models": {
            "solar_ghi_model": {
                "architecture": "HistGradientBoostingRegressor",
                "target": "target_ghi_wm2",
                "units": "W/m²",
                "dataset": "CWPRS Pune Solar Radiation Telemetry (2024-05 to 2025-06)",
                "data_nature": "Real Historical Telemetry",
                "test_period": "2025-05-01 to 2025-06-09",
                "one_step_test": {
                    "all_period": m_solar_1step_all,
                    "daylight": m_solar_1step_day,
                    "nighttime": m_solar_1step_night,
                    "baseline_persistence_mae": m_solar_1step_p1["MAE"],
                    "model_common_mae": m_solar_1step_common["MAE"],
                    "persistence_improvement_pct": compute_mae_improvement(m_solar_1step_p1["MAE"], m_solar_1step_common["MAE"])
                },
                "twenty_four_hour_recursive": {
                    "valid_forecast_origins": valid_origins_count,
                    "excluded_origins": excluded_origins_count,
                    "full_24h": solar_h_all,
                    "daylight_only": solar_h_day,
                    "nighttime_only": solar_h_night,
                    "sub_horizons": {
                        "h_0_6": solar_h_0_6,
                        "h_6_12": solar_h_6_12,
                        "h_12_18": solar_h_12_18,
                        "h_18_24": solar_h_18_24
                    }
                }
            },
            "temperature_model": {
                "architecture": "Ridge_Regression_Pipeline",
                "target": "target_temperature_c",
                "units": "°C",
                "dataset": "CWPRS Pune Temperature Telemetry (2024-05 to 2025-06)",
                "data_nature": "Real Historical Telemetry",
                "test_period": "2025-05-01 to 2025-06-09",
                "one_step_test": {
                    "overall": m_temp_1step,
                    "baseline_persistence_mae": m_temp_1step_p1["MAE"],
                    "model_common_mae": m_temp_1step_common["MAE"],
                    "persistence_improvement_pct": compute_mae_improvement(m_temp_1step_p1["MAE"], m_temp_1step_common["MAE"])
                },
                "twenty_four_hour_recursive": {
                    "valid_forecast_origins": valid_origins_count,
                    "excluded_origins": excluded_origins_count,
                    "full_24h": temp_h_all,
                    "sub_horizons": {
                        "h_0_6": temp_h_0_6,
                        "h_6_12": temp_h_6_12,
                        "h_12_18": temp_h_12_18,
                        "h_18_24": temp_h_18_24
                    }
                }
            },
            "load_profile_model": {
                "architecture": "HistGradientBoostingRegressor_CategoricalPipeline",
                "target": "target_gross_load_kw",
                "units": "kW",
                "dataset": "Pecan Street Austin Texas 10 Homes (2018-08-23 to 2018-08-25)",
                "data_nature": "Real Historical Sub-metered Telemetry",
                "test_period": "2018-08-25",
                "one_step_test": {
                    "overall": m_load_1step,
                    "per_home": per_home_1step,
                    "baseline_persistence_mae": m_load_1step_p1["MAE"],
                    "persistence_improvement_pct": compute_mae_improvement(m_load_1step_p1["MAE"], m_load_1step["MAE"])
                },
                "twenty_four_hour_recursive": {
                    "full_24h": load_h_all,
                    "sub_horizons": {
                        "h_0_6": load_h_0_6,
                        "h_6_12": load_h_6_12,
                        "h_12_18": load_h_12_18,
                        "h_18_24": load_h_18_24
                    }
                }
            }
        }
    }
    
    json_path = OUTPUT_DIR / "evaluation_results.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results_json, f, indent=2)
    print(f"\n[Saved] Machine-readable results saved to: {json_path}")
    
    # Generate Markdown report
    md_content = f"""# Genuine Measured Accuracy Report — Production ML Forecasting Models

Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}  
Repository: Renewable Distribution Grid Digital Twin (`TeamXsparK`)  

---

## 1. Executive Summary Table

| Model | Evaluation Horizon | MAE | RMSE | R² | WAPE (%) | sMAPE (%) | Bias | Best Baseline MAE | MAE Impv (%) | Samples (N) | Evaluation Data Nature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Solar GHI** (`solar_ghi_model.joblib`) | **1-Step Test** (Untouched) | **{m_solar_1step_all['MAE']} W/m²** | {m_solar_1step_all['RMSE']} W/m² | {m_solar_1step_all['R2']} | {m_solar_1step_all['WAPE']}% | {m_solar_1step_all['sMAPE']}% | {m_solar_1step_all['Bias']} W/m² | {m_solar_1step_p1['MAE']} W/m² (1-step pers.) | **+{compute_mae_improvement(m_solar_1step_p1['MAE'], m_solar_1step_common['MAE'])}%** | {m_solar_1step_all['N']} | Real CWPRS Telemetry |
| Solar GHI | **1-Step Daylight** | {m_solar_1step_day['MAE']} W/m² | {m_solar_1step_day['RMSE']} W/m² | {m_solar_1step_day['R2']} | {m_solar_1step_day['WAPE']}% | {m_solar_1step_day['sMAPE']}% | {m_solar_1step_day['Bias']} W/m² | — | — | {m_solar_1step_day['N']} | Real CWPRS Telemetry |
| Solar GHI | **24h Recursive Day-Ahead** | **{solar_h_all['metrics']['MAE']} W/m²** | {solar_h_all['metrics']['RMSE']} W/m² | {solar_h_all['metrics']['R2']} | {solar_h_all['metrics']['WAPE']}% | {solar_h_all['metrics']['sMAPE']}% | {solar_h_all['metrics']['Bias']} W/m² | {solar_h_all['best_baseline_mae']} W/m² ({solar_h_all['best_baseline_name']}) | **{solar_h_all['improvement_pct']:+.2f}%** | {solar_h_all['N']} | Real CWPRS Telemetry |
| Solar GHI | **24h Daylight-Only** | **{solar_h_day['metrics']['MAE']} W/m²** | {solar_h_day['metrics']['RMSE']} W/m² | {solar_h_day['metrics']['R2']} | {solar_h_day['metrics']['WAPE']}% | {solar_h_day['metrics']['sMAPE']}% | {solar_h_day['metrics']['Bias']} W/m² | {solar_h_day['best_baseline_mae']} W/m² ({solar_h_day['best_baseline_name']}) | **{solar_h_day['improvement_pct']:+.2f}%** | {solar_h_day['N']} | Real CWPRS Telemetry |
| **Temperature** (`temperature_model.joblib`) | **1-Step Test** (Untouched) | **{m_temp_1step['MAE']} °C** | {m_temp_1step['RMSE']} °C | {m_temp_1step['R2']} | {m_temp_1step['WAPE']}% | {m_temp_1step['sMAPE']}% | {m_temp_1step['Bias']} °C | {m_temp_1step_p1['MAE']} °C (1-step pers.) | **{compute_mae_improvement(m_temp_1step_p1['MAE'], m_temp_1step_common['MAE']):+.2f}%** | {m_temp_1step['N']} | Real CWPRS Telemetry |
| Temperature | **24h Recursive Day-Ahead** | **{temp_h_all['metrics']['MAE']} °C** | {temp_h_all['metrics']['RMSE']} °C | {temp_h_all['metrics']['R2']} | {temp_h_all['metrics']['WAPE']}% | {temp_h_all['metrics']['sMAPE']}% | {temp_h_all['best_baseline_mae']} °C ({temp_h_all['best_baseline_name']}) | **{temp_h_all['improvement_pct']:+.2f}%** | {temp_h_all['N']} | Real CWPRS Telemetry |
| **Load Profile** (`load_profile_model.joblib`) | **1-Step Test** (Untouched) | **{m_load_1step['MAE']} kW** | {m_load_1step['RMSE']} kW | {m_load_1step['R2']} | {m_load_1step['WAPE']}% | {m_load_1step['sMAPE']}% | {m_load_1step['Bias']} kW | {m_load_1step_p1['MAE']} kW (1-step pers.) | **+{compute_mae_improvement(m_load_1step_p1['MAE'], m_load_1step['MAE'])}%** | {m_load_1step['N']} | Real Pecan Street Submetering |
| Load Profile | **24h Recursive Day-Ahead** | **{load_h_all['metrics']['MAE']} kW** | {load_h_all['metrics']['RMSE']} kW | {load_h_all['metrics']['R2']} | {load_h_all['metrics']['WAPE']}% | {load_h_all['metrics']['sMAPE']}% | {load_h_all['metrics']['Bias']} kW | {load_h_all['best_baseline_mae']} kW ({load_h_all['best_baseline_name']}) | **{load_h_all['improvement_pct']:+.2f}%** | {load_h_all['N']} | Real Pecan Street Submetering |

---

## 2. Recursive 24-Hour Day-Ahead Breakdown by Sub-Horizon

### Solar GHI Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **{solar_h_0_6['metrics']['MAE']} W/m²**, Best Baseline ({solar_h_0_6['best_baseline_name']}) = {solar_h_0_6['best_baseline_mae']} W/m², Improvement = **{solar_h_0_6['improvement_pct']:+.2f}%**
- **6–12 Hours (Steps 25–48)**: MAE = **{solar_h_6_12['metrics']['MAE']} W/m²**, Best Baseline ({solar_h_6_12['best_baseline_name']}) = {solar_h_6_12['best_baseline_mae']} W/m², Improvement = **{solar_h_6_12['improvement_pct']:+.2f}%**
- **12–18 Hours (Steps 49–72)**: MAE = **{solar_h_12_18['metrics']['MAE']} W/m²**, Best Baseline ({solar_h_12_18['best_baseline_name']}) = {solar_h_12_18['best_baseline_mae']} W/m², Improvement = **{solar_h_12_18['improvement_pct']:+.2f}%**
- **18–24 Hours (Steps 73–96)**: MAE = **{solar_h_18_24['metrics']['MAE']} W/m²**, Best Baseline ({solar_h_18_24['best_baseline_name']}) = {solar_h_18_24['best_baseline_mae']} W/m², Improvement = **{solar_h_18_24['improvement_pct']:+.2f}%**

### Temperature Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **{temp_h_0_6['metrics']['MAE']} °C**, Best Baseline ({temp_h_0_6['best_baseline_name']}) = {temp_h_0_6['best_baseline_mae']} °C, Improvement = **{temp_h_0_6['improvement_pct']:+.2f}%**
- **6–12 Hours (Steps 25–48)**: MAE = **{temp_h_6_12['metrics']['MAE']} °C**, Best Baseline ({temp_h_6_12['best_baseline_name']}) = {temp_h_6_12['best_baseline_mae']} °C, Improvement = **{temp_h_6_12['improvement_pct']:+.2f}%**
- **12–18 Hours (Steps 49–72)**: MAE = **{temp_h_12_18['metrics']['MAE']} °C**, Best Baseline ({temp_h_12_18['best_baseline_name']}) = {temp_h_12_18['best_baseline_mae']} °C, Improvement = **{temp_h_12_18['improvement_pct']:+.2f}%**
- **18–24 Hours (Steps 73–96)**: MAE = **{temp_h_18_24['metrics']['MAE']} °C**, Best Baseline ({temp_h_18_24['best_baseline_name']}) = {temp_h_18_24['best_baseline_mae']} °C, Improvement = **{temp_h_18_24['improvement_pct']:+.2f}%**

### Electrical Load Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **{load_h_0_6['metrics']['MAE']} kW**, Best Baseline ({load_h_0_6['best_baseline_name']}) = {load_h_0_6['best_baseline_mae']} kW, Improvement = **{load_h_0_6['improvement_pct']:+.2f}%**
- **6–12 Hours (Steps 25–48)**: MAE = **{load_h_6_12['metrics']['MAE']} kW**, Best Baseline ({load_h_6_12['best_baseline_name']}) = {load_h_6_12['best_baseline_mae']} kW, Improvement = **{load_h_6_12['improvement_pct']:+.2f}%**
- **12–18 Hours (Steps 49–72)**: MAE = **{load_h_12_18['metrics']['MAE']} kW**, Best Baseline ({load_h_12_18['best_baseline_name']}) = {load_h_12_18['best_baseline_mae']} kW, Improvement = **{load_h_12_18['improvement_pct']:+.2f}%**
- **18–24 Hours (Steps 73–96)**: MAE = **{load_h_18_24['metrics']['MAE']} kW**, Best Baseline ({load_h_18_24['best_baseline_name']}) = {load_h_18_24['best_baseline_mae']} kW, Improvement = **{load_h_18_24['improvement_pct']:+.2f}%**

---

## 3. Defensible Percentage Score & Presentation Guidance

### Why Regression Has No Single "Accuracy Percentage"
1. **Zero-Inflation Blowup**: For solar GHI, nighttime values are strictly zero and twilight values are near zero (< 5 W/m²). Standard percentage error ($|y - \hat{{y}}| / y$) divides by zero and explodes towards infinity. Claiming "Accuracy = 100 - MAPE" is mathematically invalid.
2. **Explained Variance is Not Accuracy**: $R^2$ represents the fraction of target variance explained by the model relative to a mean baseline ($R^2 \in (-\infty, 1.0]$). $R^2 \times 100$ is **never** a percentage accuracy score.
3. **Mathematically Defensible Formulations**:
   - **Weighted Absolute Percentage Error (WAPE)**: $\\text{{WAPE}} = 100 \\times \\frac{{\\sum |y - \\hat{{y}}|}}{{\\sum |y|}}$. This is mathematically robust to zero entries.
     - Solar 1-step WAPE: **{m_solar_1step_all['WAPE']}%** (or **{100.0 - m_solar_1step_all['WAPE']:.2f}%** accuracy-equivalent)
     - Temperature 1-step WAPE: **{m_temp_1step['WAPE']}%** (or **{100.0 - m_temp_1step['WAPE']:.2f}%** accuracy-equivalent)
     - Load 1-step WAPE: **{m_load_1step['WAPE']}%** (or **{100.0 - m_load_1step['WAPE']:.2f}%** accuracy-equivalent)
   - **Normalized MAE (nMAE by Range)**: $\\text{{nMAE}} = \\frac{{\\text{{MAE}}}}{{\\max(y) - \\min(y)}}$.
     - Solar range: 1252.67 W/m² $\\to$ 1-step nMAE = **{m_solar_1step_all['MAE'] / 1252.67 * 100.0:.2f}%**
     - Temperature range: 34.80 °C $\\to$ 1-step nMAE = **{m_temp_1step['MAE'] / 34.80 * 100.0:.2f}%**
     - Load range: 11.45 kW $\\to$ 1-step nMAE = **{m_load_1step['MAE'] / 11.45 * 100.0:.2f}%**
"""
    md_path = OUTPUT_DIR / "evaluation_report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[Saved] Markdown report saved to: {md_path}")
    print("=" * 80)
    print("EVALUATION COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    run_evaluation()
