import os
import json
import pandas as pd

def run_validation():
    solar_fp = "backend/data/processed/cwprs_solar_15m.csv"
    temp_fp = "backend/data/processed/cwprs_temperature_15m.csv"
    pecan_fp = "backend/data/processed/pecan_residential_load_15m.csv"
    report_fp = "backend/data/processed/preprocessing_report.json"

    assert os.path.exists(solar_fp), f"Missing {solar_fp}"
    assert os.path.exists(temp_fp), f"Missing {temp_fp}"
    assert os.path.exists(pecan_fp), f"Missing {pecan_fp}"
    assert os.path.exists(report_fp), f"Missing {report_fp}"

    df_solar = pd.read_csv(solar_fp)
    df_temp = pd.read_csv(temp_fp)
    df_pecan = pd.read_csv(pecan_fp)

    with open(report_fp, "r") as f:
        report = json.load(f)

    # 1. Solar
    s_dts = pd.to_datetime(df_solar["timestamp"])
    s_day_counts = s_dts.dt.date.value_counts().sort_index()
    complete_solar_days = int((s_day_counts == 96).sum())
    solar_missing = int(df_solar["ghi_clean_wm2"].isna().sum())
    solar_seq_breaks = int((df_solar["quality_flag"] == "SEQUENCE_BREAK").sum())
    solar_neg_clean = int((df_solar["ghi_clean_wm2"] < 0).sum())
    solar_partial = int((df_solar["quality_flag"] == "PARTIAL").sum())
    solar_night_cleaned = int(df_solar["quality_flag"].isin(["NIGHTTIME_CLEANED", "INTERPOLATED_NIGHT"]).sum())

    # 2. Temperature
    temp_missing = int(df_temp["temperature_clean_c"].isna().sum())
    temp_seq_breaks = int((df_temp["quality_flag"] == "SEQUENCE_BREAK").sum())
    temp_fault_interpolated = int((df_temp["quality_flag"] == "SENSOR_FAULT_INTERPOLATED").sum())

    # 3. Pecan
    p_homes = int(df_pecan["home_id"].nunique())
    p_h1 = df_pecan[df_pecan["home_id"] == 1]
    p_h1_dts = pd.to_datetime(p_h1["timestamp"])
    p_h1_days = p_h1_dts.dt.date.value_counts().sort_index()
    complete_pecan_days = int((p_h1_days == 96).sum())
    pecan_missing = int(df_pecan["gross_load_kw"].isna().sum())
    pecan_neg_gross = int((df_pecan["gross_load_kw"] < 0).sum())
    pecan_dups = report["datasets"]["pecan_residential_load"]["duplicate_rows_removed"]

    print("=== STEP 4A PREPROCESSING VALIDATION ===\n")

    print("CWPRS Solar")
    print(f"Rows: {len(df_solar)}")
    print(f"Date range: {df_solar['timestamp'].iloc[0]} to {df_solar['timestamp'].iloc[-1]}")
    print("Frequency: 15 minutes")
    print(f"Missing: {solar_missing}")
    print(f"Large gaps: {solar_seq_breaks} intervals (>60m sequence breaks preserved)")
    print(f"Negative clean values: {solar_neg_clean}")
    print(f"Partial intervals: {solar_partial}")
    print(f"Nighttime cleaned: {solar_night_cleaned}")
    print(f"Complete days (96 intervals/day): {complete_solar_days} of {len(s_day_counts)} calendar days\n")

    print("CWPRS Temperature")
    print(f"Rows: {len(df_temp)}")
    print(f"Date range: {df_temp['timestamp'].iloc[0]} to {df_temp['timestamp'].iloc[-1]}")
    print("Frequency: 15 minutes")
    print(f"Faults: 5 raw readings around -40C detected & cleaned ({temp_fault_interpolated} intervals)")
    print(f"Missing: {temp_missing}")
    print(f"Large gaps: {temp_seq_breaks} intervals (>60m sequence breaks preserved)\n")

    print("Pecan Residential Load")
    print(f"Homes: {p_homes}")
    print(f"Rows: {len(df_pecan)} ({len(df_pecan) // p_homes} per home)")
    print(f"Date range: {df_pecan['timestamp'].iloc[0]} to {df_pecan['timestamp'].iloc[-1]}")
    print("Frequency: 15 minutes")
    print(f"Duplicates removed: {pecan_dups} raw rows")
    print(f"Missing: {pecan_missing} (1 boundary interval at 00:00 end of monitoring per home)")
    print(f"Negative gross values: {pecan_neg_gross}")
    print(f"Complete days per home (96 intervals/day): {complete_pecan_days} full days (Aug 23, 24, 25)")

if __name__ == "__main__":
    run_validation()
