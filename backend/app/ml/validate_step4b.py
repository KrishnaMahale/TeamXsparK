import os
import json
import pandas as pd

def run_validation():
    solar_feat_fp = "backend/data/features/solar_forecasting_features.csv"
    temp_feat_fp = "backend/data/features/temperature_forecasting_features.csv"
    load_feat_fp = "backend/data/features/load_forecasting_features.csv"
    report_fp = "backend/data/features/feature_engineering_report.json"
    metadata_fp = "backend/data/features/feature_metadata.json"

    assert os.path.exists(solar_feat_fp), f"Missing {solar_feat_fp}"
    assert os.path.exists(temp_feat_fp), f"Missing {temp_feat_fp}"
    assert os.path.exists(load_feat_fp), f"Missing {load_feat_fp}"
    assert os.path.exists(report_fp), f"Missing {report_fp}"
    assert os.path.exists(metadata_fp), f"Missing {metadata_fp}"

    with open(report_fp, "r") as f:
        report = json.load(f)

    s_data = report["datasets"]["solar"]
    t_data = report["datasets"]["temperature"]
    l_data = report["datasets"]["load"]

    s_leak = "PASSED (Zero Future Leakage)" if s_data["leakage_checks"]["passed_all_leakage_checks"] else "FAILED"
    t_leak = "PASSED (Zero Future Leakage)" if t_data["leakage_checks"]["passed_all_leakage_checks"] else "FAILED"
    l_leak = "PASSED (Zero Future Leakage)" if l_data["leakage_checks"]["passed_all_leakage_checks"] else "FAILED"

    overall_pass = (
        s_data["leakage_checks"]["passed_all_leakage_checks"]
        and t_data["leakage_checks"]["passed_all_leakage_checks"]
        and l_data["leakage_checks"]["passed_all_leakage_checks"]
    )

    print("=== STEP 4B FEATURE ENGINEERING VALIDATION ===\n")

    print("Solar:")
    print(f"Rows: {s_data['row_count']}")
    print(f"Features: {s_data['feature_count']}")
    print(f"Train: {s_data['splits']['train']} (2024-05-11 to 2025-02-28)")
    print(f"Validation: {s_data['splits']['validation']} (2025-03-01 to 2025-04-30)")
    print(f"Test: {s_data['splits']['test_or_holdout']} (2025-05-01 to 2025-06-09)")
    print(f"Leakage checks: {s_leak}\n")

    print("Temperature:")
    print(f"Rows: {t_data['row_count']}")
    print(f"Features: {t_data['feature_count']}")
    print(f"Train: {t_data['splits']['train']} (2024-05-11 to 2025-02-28)")
    print(f"Validation: {t_data['splits']['validation']} (2025-03-01 to 2025-04-30)")
    print(f"Test: {t_data['splits']['test_or_holdout']} (2025-05-01 to 2025-06-09)")
    print(f"Leakage checks: {t_leak}\n")

    print("Load:")
    print(f"Rows: {l_data['row_count']}")
    print(f"Homes: {l_data['home_count']}")
    print(f"Features: {l_data['feature_count']}")
    print(f"Train: {l_data['splits']['train']} (2018-08-23)")
    print(f"Validation: {l_data['splits']['validation']} (2018-08-24)")
    print(f"Holdout: {l_data['splits']['test_or_holdout']} (2018-08-25 to 2018-08-26 00:00)")
    print(f"Leakage checks: {l_leak}\n")

    print(f"Overall:\n{'PASS' if overall_pass else 'FAIL'}")

if __name__ == "__main__":
    run_validation()
