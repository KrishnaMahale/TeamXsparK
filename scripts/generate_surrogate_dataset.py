"""Solver-Based Dataset Generator for Learned Power-Flow Surrogate.

Generates reproducible, solver-labeled operating state datasets for:
1. default-grid (4 buses, calibrated benchmark solver)
2. medium-test-grid (5 buses, generic DistFlow solver)
3. large-test-grid (10 buses, generic DistFlow solver)

Labels are produced strictly using PowerFlowEngine.solve() with deep-copied grid states.
Partitions are grouped and scenario-aware to prevent data leakage.
"""

import os
import sys
import copy
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd

# Add backend directory to sys.path so app modules import cleanly
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FEATURES_DIR = BACKEND_DIR / "data" / "features"
MANIFEST_PATH = FEATURES_DIR / "surrogate_dataset_manifest.json"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.repositories.network_repository import (
    initialize_default_grid,
    initialize_medium_grid,
    initialize_large_grid,
)
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.schemas.simulation import NetworkLimitsConfig
from app.schemas.violation import ViolationType


def get_grid_initializers():
    return {
        "default-grid": initialize_default_grid,
        "medium-test-grid": initialize_medium_grid,
        "large-test-grid": initialize_large_grid,
    }


def get_grid_capacities(grid_id: str):
    """Return nominal capacities and power bounds for each grid."""
    if grid_id == "default-grid":
        return {
            "installed_solar_kw": 250.0,
            "peak_load_kw": 270.0,
            "min_load_kw": 30.0,
            "bat_cap_kwh": 100.0,
            "bat_max_power_kw": 60.0,
            "tx_rating_kva": 500.0,
            "has_alt_topology": True,
        }
    elif grid_id == "medium-test-grid":
        return {
            "installed_solar_kw": 140.0,
            "peak_load_kw": 200.0,
            "min_load_kw": 25.0,
            "bat_cap_kwh": 100.0,
            "bat_max_power_kw": 40.0,
            "tx_rating_kva": 350.0,
            "has_alt_topology": True,
        }
    else:  # large-test-grid
        return {
            "installed_solar_kw": 350.0,
            "peak_load_kw": 500.0,
            "min_load_kw": 60.0,
            "bat_cap_kwh": 300.0,
            "bat_max_power_kw": 120.0,
            "tx_rating_kva": 800.0,
            "has_alt_topology": True,
        }


def sample_scenario_parameters(
    scenario_type: str,
    caps: Dict[str, Any],
    rng: np.random.Generator,
) -> Dict[str, Any]:
    """Sample realistic physical inputs according to the targeted operating scenario."""
    sol_cap = caps["installed_solar_kw"]
    max_load = caps["peak_load_kw"]
    min_load = caps["min_load_kw"]
    bat_max = caps["bat_max_power_kw"]

    solar_kw = 0.0
    load_kw = float(rng.uniform(min_load, max_load * 0.7))
    battery_kw = 0.0
    curtail_kw = 0.0
    is_alt = False
    soc = float(rng.uniform(30.0, 75.0))
    is_near_limit = False

    if scenario_type == "diurnal_normal_weekday":
        # Midday or afternoon normal operating state
        hour = int(rng.choice([10, 11, 12, 13, 14, 15, 16]))
        elevation_factor = np.sin((hour - 6) / 12.0 * np.pi)
        solar_kw = float(np.clip(sol_cap * elevation_factor * rng.uniform(0.7, 0.95), 0.0, sol_cap))
        load_kw = float(rng.uniform(max_load * 0.45, max_load * 0.75))
        battery_kw = float(rng.uniform(-0.3 * bat_max, 0.2 * bat_max))
        curtail_kw = 0.0

    elif scenario_type == "diurnal_normal_weekend":
        hour = int(rng.choice([9, 11, 13, 15]))
        elevation_factor = np.sin((hour - 6) / 12.0 * np.pi)
        solar_kw = float(np.clip(sol_cap * elevation_factor * rng.uniform(0.65, 0.95), 0.0, sol_cap))
        load_kw = float(rng.uniform(min_load, max_load * 0.55))
        battery_kw = float(rng.uniform(-0.4 * bat_max, 0.1 * bat_max))

    elif scenario_type == "solar_overvoltage_moderate":
        # Clear sky, low local consumption -> voltage rise
        solar_kw = float(rng.uniform(sol_cap * 0.75, sol_cap * 0.95))
        load_kw = float(rng.uniform(min_load, min_load + (max_load - min_load) * 0.25))
        battery_kw = float(rng.uniform(-0.2 * bat_max, 0.0))
        curtail_kw = 0.0

    elif scenario_type == "solar_overvoltage_severe":
        # Peak generation exceeding nominal feeder backfeed capacity
        solar_kw = float(rng.uniform(sol_cap * 0.95, sol_cap * 1.20))
        load_kw = float(rng.uniform(min_load * 0.8, min_load * 1.4))
        battery_kw = 0.0
        curtail_kw = 0.0

    elif scenario_type == "evening_peak_demand":
        # Night or sunset, maximum domestic load -> voltage drop
        solar_kw = float(rng.uniform(0.0, 5.0))
        load_kw = float(rng.uniform(max_load * 0.75, max_load * 1.15))
        battery_kw = float(rng.uniform(0.0, 0.4 * bat_max))
        soc = float(rng.uniform(40.0, 85.0))

    elif scenario_type == "nighttime_low_load":
        # Base load at night
        solar_kw = 0.0
        load_kw = float(rng.uniform(min_load * 0.8, min_load * 1.5))
        battery_kw = 0.0
        soc = float(rng.uniform(30.0, 70.0))

    elif scenario_type == "bess_absorption_charging":
        # Battery absorbing solar surplus
        solar_kw = float(rng.uniform(sol_cap * 0.6, sol_cap * 1.0))
        load_kw = float(rng.uniform(min_load, max_load * 0.5))
        battery_kw = float(rng.uniform(-bat_max, -0.3 * bat_max))
        soc = float(rng.uniform(25.0, 75.0))

    elif scenario_type == "bess_injection_discharging":
        # Battery supporting grid during heavy load
        solar_kw = float(rng.uniform(0.0, sol_cap * 0.3))
        load_kw = float(rng.uniform(max_load * 0.6, max_load * 1.0))
        battery_kw = float(rng.uniform(0.3 * bat_max, bat_max))
        soc = float(rng.uniform(35.0, 90.0))

    elif scenario_type == "solar_curtailment_active":
        # Overvoltage mitigation via curtailment
        solar_kw = float(rng.uniform(sol_cap * 0.8, sol_cap * 1.15))
        load_kw = float(rng.uniform(min_load, max_load * 0.4))
        curtail_kw = float(rng.uniform(sol_cap * 0.1, sol_cap * 0.45))
        battery_kw = float(rng.uniform(-0.4 * bat_max, 0.0))

    elif scenario_type == "reconfiguration_alternate":
        # Alternate topology energized (tie-switch closed)
        solar_kw = float(rng.uniform(sol_cap * 0.5, sol_cap * 1.05))
        load_kw = float(rng.uniform(min_load, max_load * 0.8))
        is_alt = True
        battery_kw = float(rng.uniform(-0.5 * bat_max, 0.5 * bat_max))

    elif scenario_type == "near_limit_overvoltage":
        # Calibrated near 1.050 pu (e.g. 1.035 to 1.065 pu)
        # Moderate solar penetration with low-medium load
        solar_kw = float(rng.uniform(sol_cap * 0.65, sol_cap * 0.85))
        load_kw = float(rng.uniform(min_load * 1.2, min_load * 2.5))
        battery_kw = float(rng.uniform(-0.15 * bat_max, 0.15 * bat_max))
        is_near_limit = True

    elif scenario_type == "near_limit_undervoltage":
        # Calibrated near 0.950 pu (e.g. 0.940 to 0.965 pu)
        solar_kw = float(rng.uniform(0.0, sol_cap * 0.1))
        load_kw = float(rng.uniform(max_load * 0.90, max_load * 1.10))
        battery_kw = float(rng.uniform(-0.1 * bat_max, 0.1 * bat_max))
        is_near_limit = True

    elif scenario_type == "near_limit_feeder_overload":
        # Branch flow near 100% (95% to 105%)
        solar_kw = float(rng.uniform(sol_cap * 0.80, sol_cap * 1.05))
        load_kw = float(rng.uniform(min_load, min_load * 2.0))
        is_near_limit = True

    elif scenario_type == "near_limit_tx_overload":
        # Substation loading near 100%
        solar_kw = float(rng.uniform(0.0, sol_cap * 0.2))
        load_kw = float(rng.uniform(max_load * 1.0, max_load * 1.25))
        is_near_limit = True

    elif scenario_type == "extreme_stress_holdout":
        # Unseen extreme conditions reserved for test evaluation
        solar_kw = float(rng.uniform(sol_cap * 1.10, sol_cap * 1.35))
        load_kw = float(rng.uniform(min_load * 0.6, min_load * 1.0))
        curtail_kw = float(rng.uniform(0.0, sol_cap * 0.15))
        soc = float(rng.choice([18.0, 96.0]))  # saturated or depleted
        is_near_limit = True

    # Clamp physically
    solar_kw = float(np.round(np.maximum(0.0, solar_kw), 1))
    load_kw = float(np.round(np.maximum(10.0, load_kw), 1))
    curtail_kw = float(np.round(np.clip(curtail_kw, 0.0, solar_kw), 1))
    battery_kw = float(np.round(np.clip(battery_kw, -bat_max, bat_max), 1))
    soc = float(np.round(np.clip(soc, 15.0, 98.0), 1))

    return {
        "solar_kw": solar_kw,
        "load_kw": load_kw,
        "battery_power_kw": battery_kw,
        "solar_curtailment_kw": curtail_kw,
        "is_alternative_topology": is_alt,
        "battery_soc_percent": soc,
        "is_near_limit": is_near_limit,
    }


def generate_grid_dataset(
    grid_id: str,
    target_count: int,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate solver-labeled samples for a specified grid."""
    rng = np.random.Generator(np.random.PCG64(seed))
    initializers = get_grid_initializers()
    grid_fn = initializers[grid_id]
    caps = get_grid_capacities(grid_id)

    # Scenarios distribution
    scenario_weights = [
        ("diurnal_normal_weekday", 0.25),
        ("diurnal_normal_weekend", 0.10),
        ("solar_overvoltage_moderate", 0.12),
        ("solar_overvoltage_severe", 0.08),
        ("evening_peak_demand", 0.08),
        ("nighttime_low_load", 0.05),
        ("bess_absorption_charging", 0.06),
        ("bess_injection_discharging", 0.06),
        ("solar_curtailment_active", 0.05),
        ("reconfiguration_alternate", 0.05),
        ("near_limit_overvoltage", 0.03),
        ("near_limit_undervoltage", 0.02),
        ("near_limit_feeder_overload", 0.02),
        ("near_limit_tx_overload", 0.01),
        ("extreme_stress_holdout", 0.02),
    ]

    scenarios = [s[0] for s in scenario_weights]
    probs = np.array([s[1] for s in scenario_weights])
    probs = probs / probs.sum()

    limits = NetworkLimitsConfig(
        voltageMinPu=0.95,
        voltageMaxPu=1.05,
        feederLoadingLimitPercent=100.0,
        transformerLoadingLimitPercent=100.0,
    )

    records = []
    failed_count = 0

    print(f"[{grid_id}] Generating {target_count} solver-labeled samples (seed={seed})...")

    # Split assignment rules:
    # 70% train, 15% val, 15% test
    # extreme_stress_holdout is strictly 'test'
    # near_limit_* scenarios are balanced across val and test to evaluate boundary performance
    for idx in range(target_count):
        scenario_type = str(rng.choice(scenarios, p=probs))
        params = sample_scenario_parameters(scenario_type, caps, rng)

        # Split assignment
        if scenario_type == "extreme_stress_holdout":
            split_set = "test"
        elif "near_limit" in scenario_type:
            # 50% val, 50% test for boundary evaluation
            split_set = "test" if (idx % 2 == 0) else "validation"
        else:
            r_val = rng.uniform(0.0, 1.0)
            if r_val < 0.70:
                split_set = "train"
            elif r_val < 0.85:
                split_set = "validation"
            else:
                split_set = "test"

        # Solve with physical solver on clean deep-copy of grid
        grid_copy = copy.deepcopy(grid_fn())
        pf = PowerFlowEngine(is_alternative_topology=params["is_alternative_topology"])

        try:
            buses, feeders, total_loss, tx_loading = pf.solve(
                grid=grid_copy,
                solar_kw=params["solar_kw"],
                load_kw=params["load_kw"],
                battery_power_kw=params["battery_power_kw"],
                solar_curtailment_kw=params["solar_curtailment_kw"],
                installed_solar_capacity_kw=caps["installed_solar_kw"],
            )

            # Check constraints using authoritative ConstraintChecker
            violations = ConstraintChecker.check_all(
                buses=buses,
                feeders=feeders,
                time_str="12:00",
                config=limits,
                transformer=grid_copy.substation,
                tx_loading_pct=tx_loading,
                tx_flow_kva=getattr(pf, "last_tx_flow_kva", None),
            )

            has_ov = any(v.type == ViolationType.OVER_VOLTAGE for v in violations)
            has_uv = any(v.type == ViolationType.UNDER_VOLTAGE for v in violations)
            has_fo = any(v.type == ViolationType.FEEDER_OVERLOAD for v in violations)
            has_to = any(v.type == ViolationType.TRANSFORMER_OVERLOAD for v in violations)
            is_safe = (len(violations) == 0)

            # Build row
            net_sol = max(0.0, params["solar_kw"] - params["solar_curtailment_kw"])
            net_imb = net_sol + params["battery_power_kw"] - params["load_kw"]

            rec = {
                "sample_id": f"{grid_id}_{idx:06d}",
                "grid_id": grid_id,
                "scenario_type": scenario_type,
                "split_set": split_set,
                "is_near_limit": int(params["is_near_limit"]),
                # Features
                "solar_kw": params["solar_kw"],
                "load_kw": params["load_kw"],
                "battery_power_kw": params["battery_power_kw"],
                "solar_curtailment_kw": params["solar_curtailment_kw"],
                "net_solar_kw": net_sol,
                "net_imbalance_kw": net_imb,
                "is_alternative_topology": int(params["is_alternative_topology"]),
                "battery_soc_percent": params["battery_soc_percent"],
                "installed_solar_capacity_kw": caps["installed_solar_kw"],
                "transformer_rating_kva": caps["tx_rating_kva"],
                # System Targets
                "total_loss_kw": round(float(total_loss), 2),
                "tx_loading_percent": round(float(tx_loading), 2),
                # Violation Labels
                "has_overvoltage": int(has_ov),
                "has_undervoltage": int(has_uv),
                "has_feeder_overload": int(has_fo),
                "has_tx_overload": int(has_to),
                "is_safe": int(is_safe),
                "violations_count": len(violations),
                "solver_success": 1,
            }

            # Per-bus voltage targets
            for b in buses:
                rec[f"voltage_{b.id}"] = round(float(b.voltage), 4)

            # Per-feeder loading targets
            for f in feeders:
                clean_fid = f.id.replace("-", "_")
                rec[f"loading_{clean_fid}"] = round(float(f.loadingPercent), 2)

            records.append(rec)

        except Exception as e:
            failed_count += 1
            print(f"  Warning: solver error at sample {idx}: {e}")

    df = pd.DataFrame(records)
    print(f"[{grid_id}] Finished: {len(df)} valid samples generated ({failed_count} solver failures).")
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate solver-labeled surrogate datasets.")
    parser.add_argument("--pilot", action="store_true", help="Run pilot generation (100 samples per grid).")
    parser.add_argument("--seed", type=int, default=42, help="Random generation seed.")
    parser.add_argument("--output-dir", type=str, default="backend/data/features", help="Output directory.")
    args = parser.parse_args()

    out_dir = REPO_ROOT / args.output_dir
    os.makedirs(out_dir, exist_ok=True)

    if args.pilot:
        print("=== PILOT DATASET GENERATION MODE ===")
        counts = {
            "default-grid": 100,
            "medium-test-grid": 100,
            "large-test-grid": 100,
        }
    else:
        print("=== FULL INITIAL DATASET GENERATION (10,000 Valid Labeled States) ===")
        counts = {
            "default-grid": 4000,
            "medium-test-grid": 3000,
            "large-test-grid": 3000,
        }

    manifest = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "seed": args.seed,
        "is_pilot": args.pilot,
        "grids": {},
    }

    for grid_id, count in counts.items():
        df_grid = generate_grid_dataset(grid_id, count, seed=args.seed)
        clean_name = grid_id.replace("-", "_")
        csv_path = out_dir / f"surrogate_dataset_{clean_name}.csv"
        df_grid.to_csv(csv_path, index=False)
        print(f"  Saved {len(df_grid)} samples to {csv_path}")

        # Manifest entry
        splits = df_grid["split_set"].value_counts().to_dict()
        scenarios = df_grid["scenario_type"].value_counts().to_dict()
        safe_count = int(df_grid["is_safe"].sum())
        unsafe_count = int(len(df_grid) - safe_count)

        manifest["grids"][grid_id] = {
            "csv_file": str(csv_path.name),
            "total_samples": len(df_grid),
            "splits": splits,
            "safe_states": safe_count,
            "unsafe_states": unsafe_count,
            "near_limit_states": int(df_grid["is_near_limit"].sum()),
            "scenarios": scenarios,
            "feature_columns": [c for c in df_grid.columns if not c.startswith(("voltage_", "loading_", "tx_", "total_", "has_", "is_safe", "violations_", "sample_id", "grid_id", "scenario_", "split_", "is_near_", "solver_"))],
            "target_voltage_columns": [c for c in df_grid.columns if c.startswith("voltage_")],
            "target_loading_columns": [c for c in df_grid.columns if c.startswith("loading_")],
        }

    manifest_path = out_dir / "surrogate_dataset_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest written to {manifest_path}")
    print("Dataset generation completed successfully.")


if __name__ == "__main__":
    main()
