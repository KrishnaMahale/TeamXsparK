"""Experimental comparison of candidate temperature forecasting architectures.

Isolates candidates and tests them on chronological Train and Validation splits:
- Training period: <= 2025-02-28
- Validation period: 2025-03-01 to 2025-04-30
- Untouched Test period: >= 2025-05-01 (reserved for final evaluation)

Candidates tested:
1. Baselines:
   - Flat Persistence from origin (t0)
   - Previous-Day 24h lag (t - 24h)
   - Time-of-Day Climatology (learned from train only)
   - Anomaly-Decay Baseline: PrevDay + Delta_t0 * exp(-h / tau)
2. Approach A: Improved Direct Ridge Regression (No recursive lag_15m feedback)
3. Approach B: Direct HistGradientBoostingRegressor (Tree-based nonlinear model)
4. Approach C: Residual / Delta Estimator (predicts T(t) - T(t-24h))
5. Approach D: Multi-Horizon Direct Forecasters
"""

import math
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent.parent
FEATURES_DIR = BASE_DIR / "backend" / "data" / "features"


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray):
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    yt = y_true[mask]
    yp = y_pred[mask]
    mae = float(mean_absolute_error(yt, yp))
    rmse = float(np.sqrt(mean_squared_error(yt, yp)))
    r2 = float(r2_score(yt, yp)) if (len(yt) > 1 and np.var(yt) > 1e-9) else 0.0
    bias = float(np.mean(yp - yt))
    return {"MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4), "Bias": round(bias, 4), "N": int(len(yt))}


def run_experiment():
    print("=" * 80)
    print("TEMPERATURE CANDIDATE MODEL EXPERIMENTS ON CHRONOLOGICAL VALIDATION SET")
    print("=" * 80)

    df = pd.read_csv(FEATURES_DIR / "temperature_forecasting_features.csv")
    dts = pd.to_datetime(df["timestamp"])
    df["date"] = dts.dt.date

    # Build Day-Ahead Dataset where each day's origin is 00:00 IST
    def build_day_dataset(split_name: str):
        split_df = df[df["split_set"] == split_name].copy()
        records = []
        for d in split_df["date"].unique():
            day_rows = split_df[split_df["date"] == d].sort_values("timestamp").reset_index(drop=True)
            if len(day_rows) == 0:
                continue
            t_start = day_rows["timestamp"].iloc[0]
            hist = df[df["timestamp"] < t_start].tail(96)
            if len(hist) < 96:
                continue

            t0_valid = hist["target_temperature_c"].dropna()
            if len(t0_valid) == 0:
                continue
            t0 = float(t0_valid.iloc[-1])
            p24_arr = hist["target_temperature_c"].ffill().bfill().values
            p24_origin = float(p24_arr[-1]) if len(p24_arr) > 0 else t0
            delta_t0 = t0 - p24_origin

            # 4-hour trend prior to origin
            last_4h = hist["target_temperature_c"].dropna().tail(16).values
            trend_4h = (last_4h[-1] - last_4h[0]) if len(last_4h) >= 2 else 0.0
            mean_4h = float(np.mean(last_4h)) if len(last_4h) > 0 else t0

            for i, r in day_rows.iterrows():
                act = r["target_temperature_c"]
                p24_val = float(p24_arr[i]) if i < len(p24_arr) else np.nan
                step = i + 1  # 1 to 96
                records.append({
                    "actual": act,
                    "temp_prev_day": p24_val,
                    "temp_origin": t0,
                    "delta_t0": delta_t0,
                    "trend_4h": trend_4h,
                    "mean_4h": mean_4h,
                    "slot_15m": int(r["slot_15m"]),
                    "hour": int(r["hour"]),
                    "minute_of_day": int(r["minute_of_day"]),
                    "day_of_week": int(r["day_of_week"]),
                    "day_of_year": int(r["day_of_year"]),
                    "month": int(r["month"]),
                    "day_of_year_sin": float(r["day_of_year_sin"]),
                    "day_of_year_cos": float(r["day_of_year_cos"]),
                    "slot_15m_sin": float(r["slot_15m_sin"]),
                    "slot_15m_cos": float(r["slot_15m_cos"]),
                    "solar_elevation_deg": float(r["solar_elevation_deg"]),
                    "step": step,
                    "date": d
                })
        return pd.DataFrame(records)

    print("Building day-origin datasets...")
    train_data = build_day_dataset("train")
    val_data = build_day_dataset("validation")

    print(f"Train valid targets: {train_data['actual'].notna().sum()} / {len(train_data)}")
    print(f"Val valid targets:   {val_data['actual'].notna().sum()} / {len(val_data)}")

    tr_valid = train_data[train_data["actual"].notna()].copy()
    val_valid = val_data[val_data["actual"].notna()].copy()

    # Calculate Climatology on Training set ONLY
    climatology_map = tr_valid.groupby("slot_15m")["actual"].mean().to_dict()

    # --- BASELINES ON VALIDATION ---
    print("\n" + "-" * 60)
    print("EVALUATING BASELINES ON VALIDATION SET")
    print("-" * 60)

    y_val = val_valid["actual"].values
    pers_origin_val = val_valid["temp_origin"].values
    prev_day_val = val_valid["temp_prev_day"].values
    climatology_val = np.array([climatology_map.get(s, 25.0) for s in val_valid["slot_15m"]])

    m_pers = calculate_metrics(y_val, pers_origin_val)
    m_prev = calculate_metrics(y_val, prev_day_val)
    m_clim = calculate_metrics(y_val, climatology_val)

    # Anomaly decay baseline: PrevDay + Delta_t0 * exp(-step / tau)
    # Grid search tau on training set
    best_tau = 16.0
    best_tau_mae = 999.0
    for tau in [4.0, 8.0, 12.0, 16.0, 24.0, 32.0, 48.0]:
        decay_tr = tr_valid["temp_prev_day"] + tr_valid["delta_t0"] * np.exp(-tr_valid["step"] / tau)
        m_t = calculate_metrics(tr_valid["actual"].values, decay_tr.values)
        if m_t["MAE"] < best_tau_mae:
            best_tau_mae = m_t["MAE"]
            best_tau = tau

    decay_val = val_valid["temp_prev_day"] + val_valid["delta_t0"] * np.exp(-val_valid["step"] / best_tau)
    m_decay = calculate_metrics(y_val, decay_val.values)

    print(f"Baseline 1 (Flat Persistence from origin):  MAE = {m_pers['MAE']} °C, RMSE = {m_pers['RMSE']} °C, R² = {m_pers['R2']}")
    print(f"Baseline 2 (Previous-Day 24h):             MAE = {m_prev['MAE']} °C, RMSE = {m_prev['RMSE']} °C, R² = {m_prev['R2']}")
    print(f"Baseline 3 (Train Time-of-Day Climatology): MAE = {m_clim['MAE']} °C, RMSE = {m_clim['RMSE']} °C, R² = {m_clim['R2']}")
    print(f"Baseline 4 (PrevDay + Anomaly Decay tau={best_tau}): MAE = {m_decay['MAE']} °C, RMSE = {m_decay['RMSE']} °C, R² = {m_decay['R2']}")

    # --- CANDIDATE MODELS ---
    print("\n" + "-" * 60)
    print("TRAINING AND EVALUATING CANDIDATE MODELS ON VALIDATION SET")
    print("-" * 60)

    feature_cols = [
        "temp_prev_day", "temp_origin", "delta_t0", "trend_4h",
        "slot_15m", "hour", "day_of_week", "day_of_year", "month",
        "day_of_year_sin", "day_of_year_cos", "slot_15m_sin", "slot_15m_cos",
        "solar_elevation_deg", "step"
    ]

    # Candidate 1: Direct Ridge Regression
    ridge_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", Ridge(alpha=50.0, random_state=42))
    ])
    ridge_pipe.fit(tr_valid[feature_cols], tr_valid["actual"])
    p_ridge = ridge_pipe.predict(val_valid[feature_cols])
    m_cand1 = calculate_metrics(y_val, p_ridge)
    print(f"Candidate 1 (Direct Ridge Regression):      MAE = {m_cand1['MAE']} °C, RMSE = {m_cand1['RMSE']} °C, R² = {m_cand1['R2']}, Bias = {m_cand1['Bias']} °C")

    # Candidate 2: Direct HistGradientBoostingRegressor
    hgb_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", HistGradientBoostingRegressor(
            max_iter=150,
            learning_rate=0.05,
            max_leaf_nodes=31,
            l2_regularization=2.0,
            random_state=42
        ))
    ])
    hgb_pipe.fit(tr_valid[feature_cols], tr_valid["actual"])
    p_hgb = hgb_pipe.predict(val_valid[feature_cols])
    m_cand2 = calculate_metrics(y_val, p_hgb)
    print(f"Candidate 2 (Direct HistGradientBoosting):  MAE = {m_cand2['MAE']} °C, RMSE = {m_cand2['RMSE']} °C, R² = {m_cand2['R2']}, Bias = {m_cand2['Bias']} °C")

    # Candidate 3: Residual / Delta Predictor with HistGradientBoosting
    # Predict delta = actual - temp_prev_day
    tr_delta = tr_valid["actual"] - tr_valid["temp_prev_day"]
    delta_hgb = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", HistGradientBoostingRegressor(
            max_iter=100,
            learning_rate=0.04,
            max_leaf_nodes=20,
            l2_regularization=5.0,
            random_state=42
        ))
    ])
    delta_hgb.fit(tr_valid[feature_cols], tr_delta)
    pred_delta = delta_hgb.predict(val_valid[feature_cols])
    p_delta_model = val_valid["temp_prev_day"].values + pred_delta
    m_cand3 = calculate_metrics(y_val, p_delta_model)
    print(f"Candidate 3 (Residual Delta HGB + PrevDay): MAE = {m_cand3['MAE']} °C, RMSE = {m_cand3['RMSE']} °C, R² = {m_cand3['R2']}, Bias = {m_cand3['Bias']} °C")

    # Candidate 4: Residual Ridge
    delta_ridge = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", Ridge(alpha=100.0, random_state=42))
    ])
    delta_ridge.fit(tr_valid[feature_cols], tr_delta)
    pred_delta_ridge = delta_ridge.predict(val_valid[feature_cols])
    p_delta_ridge_model = val_valid["temp_prev_day"].values + pred_delta_ridge
    m_cand4 = calculate_metrics(y_val, p_delta_ridge_model)
    print(f"Candidate 4 (Residual Delta Ridge + PrevDay): MAE = {m_cand4['MAE']} °C, RMSE = {m_cand4['RMSE']} °C, R² = {m_cand4['R2']}, Bias = {m_cand4['Bias']} °C")

    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY & COMPARISON WITH PREVIOUS-DAY BASELINE (1.1360 °C)")
    print("=" * 80)
    candidates = [
        ("Baseline_PrevDay", m_prev),
        ("Baseline_Decay", m_decay),
        ("Cand1_Direct_Ridge", m_cand1),
        ("Cand2_Direct_HGB", m_cand2),
        ("Cand3_Residual_HGB", m_cand3),
        ("Cand4_Residual_Ridge", m_cand4),
    ]
    for name, m in candidates:
        imp = (m_prev["MAE"] - m["MAE"]) / m_prev["MAE"] * 100.0
        print(f"  {name:25s}: MAE = {m['MAE']:6.4f} °C, RMSE = {m['RMSE']:6.4f} °C, R² = {m['R2']:6.4f}, Imp vs PrevDay = {imp:+6.2f}%")


if __name__ == "__main__":
    run_experiment()
