"""
Comprehensive Benchmark Script for ENR-02 Step 5B:
Evaluates like-for-like performance of Baseline Direct Physical Controller vs
Activated & Optimized Surrogate-Screened Controller across:
- Grids: default-grid, medium-test-grid, large-test-grid
- Horizons: H=8, H=24, H=96
- Metrics: Total planning wall-clock time (Median/P90), Physical solves, Pruned candidates,
  Surrogate evaluations, Fallbacks, Selected first action, Trajectory cost,
  Violations, Terminal SOC, Curtailment, Speedup/slowdown.
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController
from app.schemas.sequential_control import SequentialControlRequest, SequentialForecastPoint


def make_forecast(steps: int) -> List[SequentialForecastPoint]:
    points = []
    for i in range(steps):
        h = (12 + (i * 15) // 60) % 24
        m = (i * 15) % 60
        # Realistic diurnal pattern
        solar = max(0.0, 120.0 * np.sin(np.pi * (i % 48) / 48.0))
        load = 40.0 + 30.0 * np.cos(np.pi * (i % 48) / 48.0)
        points.append(
            SequentialForecastPoint(
                time=f"{h:02d}:{m:02d}",
                solarKw=round(float(solar), 2),
                loadKw=round(float(load), 2),
            )
        )
    return points


async def run_step5b_benchmark():
    repo = NetworkRepository()
    grids = ["default-grid", "medium-test-grid", "large-test-grid"]
    horizons = [8, 24, 96]
    n_runs = 5

    benchmark_data = {}

    for grid_id in grids:
        grid = await repo.get_grid(grid_id)
        benchmark_data[grid_id] = {}
        print(f"\n=======================================================")
        print(f"BENCHMARKING GRID: {grid_id}")
        print(f"=======================================================")

        for H in horizons:
            forecast = make_forecast(H)

            # Warm-up run for both
            warm_req_dir = SequentialControlRequest(
                gridId=grid_id, startTimestep="12:00", horizonSteps=H,
                forecastData=forecast, allowSurrogateScreening=False,
            )
            SequentialController(grid=grid, use_surrogate_screening=False).plan(warm_req_dir)

            warm_req_surr = SequentialControlRequest(
                gridId=grid_id, startTimestep="12:00", horizonSteps=H,
                forecastData=forecast, allowSurrogateScreening=True,
            )
            SequentialController(grid=grid, use_surrogate_screening=True).plan(warm_req_surr)

            # Measure Direct Physical Path
            latencies_dir = []
            resp_dir = None
            for _ in range(n_runs):
                t0 = time.perf_counter()
                ctrl = SequentialController(grid=grid, use_surrogate_screening=False)
                resp_dir = ctrl.plan(warm_req_dir)
                latencies_dir.append((time.perf_counter() - t0) * 1000.0)

            # Measure Integrated Surrogate Path
            latencies_surr = []
            resp_surr = None
            for _ in range(n_runs):
                t0 = time.perf_counter()
                ctrl = SequentialController(grid=grid, use_surrogate_screening=True)
                resp_surr = ctrl.plan(warm_req_surr)
                latencies_surr.append((time.perf_counter() - t0) * 1000.0)

            # Check trajectory parity
            match_actions = 0
            if resp_dir.plannedTrajectory and resp_surr.plannedTrajectory:
                for a_d, a_s in zip(resp_dir.plannedTrajectory, resp_surr.plannedTrajectory):
                    if (
                        a_d.actionType == a_s.actionType
                        and a_d.batteryPowerKw == a_s.batteryPowerKw
                        and a_d.targetTopology == a_s.targetTopology
                        and a_d.curtailmentKw == a_s.curtailmentKw
                    ):
                        match_actions += 1

            parity_pct = (match_actions / H) * 100.0
            med_dir = float(np.median(latencies_dir))
            p90_dir = float(np.percentile(latencies_dir, 90))
            med_surr = float(np.median(latencies_surr))
            p90_surr = float(np.percentile(latencies_surr, 90))

            solves_dir = resp_dir.physicalSolveCount
            solves_surr = resp_surr.physicalSolveCount
            pruned = resp_surr.surrogatePrunedCount
            solves_reduction_pct = (1.0 - solves_surr / solves_dir) * 100.0 if solves_dir > 0 else 0.0

            first_act_dir = resp_dir.recommendedFirstAction.title if resp_dir.recommendedFirstAction else "None"
            first_act_surr = resp_surr.recommendedFirstAction.title if resp_surr.recommendedFirstAction else "None"

            entry = {
                "grid_id": grid_id,
                "horizon_steps": H,
                "direct_solves": solves_dir,
                "direct_median_ms": round(med_dir, 2),
                "direct_p90_ms": round(p90_dir, 2),
                "direct_feasible": resp_dir.isFeasible,
                "direct_first_action": first_act_dir,
                "direct_curtailment_kwh": resp_dir.totalSolarCurtailmentKwh,
                "direct_loss_kwh": resp_dir.totalLossKwh,
                "direct_terminal_soc": resp_dir.terminalSocPercent,
                "surrogate_solves": solves_surr,
                "surrogate_pruned": pruned,
                "surrogate_evaluations": resp_surr.surrogateEvaluationCount,
                "surrogate_fallbacks": resp_surr.surrogateFallbackCount,
                "solves_reduction_percent": round(solves_reduction_pct, 2),
                "surrogate_median_ms": round(med_surr, 2),
                "surrogate_p90_ms": round(p90_surr, 2),
                "surrogate_feasible": resp_surr.isFeasible,
                "surrogate_first_action": first_act_surr,
                "surrogate_curtailment_kwh": resp_surr.totalSolarCurtailmentKwh,
                "surrogate_loss_kwh": resp_surr.totalLossKwh,
                "surrogate_terminal_soc": resp_surr.terminalSocPercent,
                "trajectory_parity_percent": round(parity_pct, 2),
                "speedup_ratio": round(med_dir / med_surr, 2) if med_surr > 0 else 0.0,
            }

            benchmark_data[grid_id][f"H={H}"] = entry

            print(f"Horizon H={H:2d}:")
            print(f"  Direct: Solves={solves_dir:4d} | Med={med_dir:6.1f}ms | P90={p90_dir:6.1f}ms | Feas={resp_dir.isFeasible} | Action='{first_act_dir}'")
            print(f"  Surr:   Solves={solves_surr:4d} (Pruned={pruned:4d}, -{solves_reduction_pct:4.1f}%) | Med={med_surr:6.1f}ms | P90={p90_surr:6.1f}ms | Feas={resp_surr.isFeasible} | Action='{first_act_surr}'")
            print(f"  Parity: {parity_pct:5.1f}% matching actions | Solves cut: -{solves_reduction_pct:.1f}%")

    out_path = Path("scratch/benchmark_step5b_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)
    print(f"\nSaved comprehensive benchmark results to {out_path}")

if __name__ == "__main__":
    asyncio.run(run_step5b_benchmark())
