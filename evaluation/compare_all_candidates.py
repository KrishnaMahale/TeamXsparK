"""Evaluation and Comparison of Candidate Temperature Models across Horizons, Time-of-Day, and Hit Rates.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

df = pd.read_csv("backend/data/features/temperature_forecasting_features.csv")
dts = pd.to_datetime(df["timestamp"])
df["date"] = dts.dt.date

train_df = df[df["split_set"] == "train"].copy()
val_df = df[df["split_set"] == "validation"].copy()
test_df = df[df["split_set"] == "test"].copy()

def prep_dataset(split_df):
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
        if len(p24_arr) < 96:
            p24_arr = np.pad(p24_arr, (0, 96 - len(p24_arr)), "edge")
            
        for i, r in day_rows.iterrows():
            act = r["target_temperature_c"]
            p24 = p24_arr[i] if i < len(p24_arr) else np.nan
            records.append({
                "actual": act,
                "minute_of_day": int(r["minute_of_day"]),
                "slot_15m": int(r["slot_15m"]),
                "hour": int(r["hour"]),
                "day_of_week": int(r["day_of_week"]),
                "day_of_year": int(r["day_of_year"]),
                "month": int(r["month"]),
                "day_of_year_sin": float(r["day_of_year_sin"]),
                "day_of_year_cos": float(r["day_of_year_cos"]),
                "slot_15m_sin": float(r["slot_15m_sin"]),
                "slot_15m_cos": float(r["slot_15m_cos"]),
                "solar_elevation_deg": float(r["solar_elevation_deg"]),
                "temperature_lag_15m": t0,  # Anchor origin temperature
                "temperature_lag_24h": p24,
                "step": i + 1,
                "date": str(d)
            })
    return pd.DataFrame(records)

print("Preparing datasets...")
tr_data = prep_dataset(train_df)
val_data = prep_dataset(val_df)
test_data = prep_dataset(test_df)

tr_val_data = pd.concat([tr_data, val_data], ignore_index=True)
tr_val_clean = tr_val_data[tr_val_data["actual"].notna()].copy()
val_clean = val_data[val_data["actual"].notna()].copy()
test_clean = test_data[test_data["actual"].notna()].copy()

feats_13 = [
    "minute_of_day", "slot_15m", "hour", "day_of_week", "day_of_year", "month",
    "day_of_year_sin", "day_of_year_cos", "slot_15m_sin", "slot_15m_cos",
    "solar_elevation_deg", "temperature_lag_15m", "temperature_lag_24h"
]

feats_12 = [
    "minute_of_day", "slot_15m", "hour", "day_of_week", "day_of_year", "month",
    "day_of_year_sin", "day_of_year_cos", "slot_15m_sin", "slot_15m_cos",
    "solar_elevation_deg", "temperature_lag_24h"
]

# Train Candidates on Train+Val
print("Training Candidate A (Direct Ridge alpha=100 on feats_13)...")
cand_a = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("sc", StandardScaler()),
    ("m", Ridge(alpha=100.0, random_state=42))
])
cand_a.fit(tr_val_clean[feats_13], tr_val_clean["actual"])

print("Training Candidate B (Direct HGB on feats_13)...")
cand_b = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("m", HistGradientBoostingRegressor(max_iter=100, learning_rate=0.04, max_leaf_nodes=20, l2_regularization=2.0, random_state=42))
])
cand_b.fit(tr_val_clean[feats_13], tr_val_clean["actual"])

print("Training Candidate C (Direct HGB on feats_12 - no lag_15m)...")
cand_c = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("m", HistGradientBoostingRegressor(max_iter=100, learning_rate=0.04, max_leaf_nodes=20, l2_regularization=2.0, random_state=42))
])
cand_c.fit(tr_val_clean[feats_12], tr_val_clean["actual"])

print("Training Candidate D (Residual Delta HGB on feats_13)...")
delta_tr = tr_val_clean["actual"].values - tr_val_clean["temperature_lag_24h"].values
cand_d = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("m", HistGradientBoostingRegressor(max_iter=80, learning_rate=0.03, max_leaf_nodes=15, l2_regularization=5.0, random_state=42))
])
cand_d.fit(tr_val_clean[feats_13], delta_tr)

# Evaluate on TEST
yt = test_clean["actual"].values
p_prev = test_clean["temperature_lag_24h"].values
p_flat = test_clean["temperature_lag_15m"].values

pred_a = cand_a.predict(test_clean[feats_13])
pred_b = cand_b.predict(test_clean[feats_13])
pred_c = cand_c.predict(test_clean[feats_12])
pred_d = p_prev + cand_d.predict(test_clean[feats_13])

def compute_all_metrics(actual, pred, name):
    mask = ~np.isnan(actual) & ~np.isnan(pred)
    a = actual[mask]
    p = pred[mask]
    err = np.abs(a - p)
    mae = float(mean_absolute_error(a, p))
    rmse = float(np.sqrt(mean_squared_error(a, p)))
    r2 = float(r2_score(a, p))
    bias = float(np.mean(p - a))
    hit_1c = float(np.mean(err < 1.0) * 100.0)
    hit_2c = float(np.mean(err < 2.0) * 100.0)
    hit_3c = float(np.mean(err < 3.0) * 100.0)
    return {
        "name": name,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
        "Bias": bias,
        "Hit_<1C": hit_1c,
        "Hit_<2C": hit_2c,
        "Hit_<3C": hit_3c,
        "N": len(a)
    }

print("\n" + "=" * 90)
print(f"{'MODEL':<30} | {'MAE (°C)':<9} | {'RMSE (°C)':<9} | {'R²':<7} | {'Bias (°C)':<9} | {'<1°C':<6} | {'<2°C':<6} | {'<3°C':<6}")
print("=" * 90)

models_eval = [
    (yt, p_flat, "Flat Persistence (00:00)"),
    (yt, p_prev, "Previous-Day Baseline (24h)"),
    (yt, pred_a, "Cand A: Direct Ridge (feats_13)"),
    (yt, pred_b, "Cand B: Direct HGB (feats_13)"),
    (yt, pred_c, "Cand C: Direct HGB (feats_12)"),
    (yt, pred_d, "Cand D: Residual Delta HGB"),
]

mae_prev = mean_absolute_error(yt, p_prev)

for a, p, name in models_eval:
    m = compute_all_metrics(a, p, name)
    imp = (mae_prev - m["MAE"]) / mae_prev * 100.0
    print(f"{m['name']:<30} | {m['MAE']:9.4f} | {m['RMSE']:9.4f} | {m['R2']:7.4f} | {m['Bias']:9.4f} | {m['Hit_<1C']:5.1f}% | {m['Hit_<2C']:5.1f}% | {m['Hit_<3C']:5.1f}%")

print("=" * 90)

# Evaluate Cand B and Cand D by Horizon
for m_label, p_arr in [("Cand B (Direct HGB)", pred_b), ("Cand D (Residual HGB)", pred_d), ("Prev-Day Baseline", p_prev)]:
    print(f"\n--- Horizon Breakdown for {m_label} ---")
    for h_name, (h_min, h_max) in [("0-6h (1-24)", (1, 24)), ("6-12h (25-48)", (25, 48)), ("12-18h (49-72)", (49, 72)), ("18-24h (73-96)", (73, 96))]:
        sub_mask = test_clean["step"].between(h_min, h_max).values
        sub_a = yt[sub_mask]
        sub_p = p_arr[sub_mask]
        sub_m = compute_all_metrics(sub_a, sub_p, h_name)
        print(f"  {h_name:<15}: MAE = {sub_m['MAE']:.4f} °C, RMSE = {sub_m['RMSE']:.4f} °C, Bias = {sub_m['Bias']:.4f} °C, <1°C Hit = {sub_m['Hit_<1C']:.1f}%")
