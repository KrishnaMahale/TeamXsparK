"""
Benchmarking script for ENR-02 Step 5A:
Safe Surrogate Integration into Sequential MPC Candidate Evaluation.

Evaluates like-for-like performance of Baseline Direct Physical Controller vs
Integrated Surrogate-Screened Controller across:
- Grids: default-grid, medium-test-grid, large-test-grid
- Horizons: H=8, H=24, H=96
- Metrics: Candidate counts, Surrogate calls, Physical solve counts,
  Median/P90 Latencies, Trajectory parity, Feasible candidate preservation.
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
        # Diurnal pattern
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


async def run_benchmark():
    repo = NetworkRepository()
    grids = ["default-grid", "medium-test-grid", "large-test-grid"]
    horizons = [8, 24, 96]
    n_runs = 5

    results = []

    for grid_id in grids:
        grid = await repo.get_grid(grid_id)
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
                        and a_d.curtailmentKw == a_s.curtailmentKw
                        and a_d.targetTopology == a_s.targetTopology
                    ):
                        match_actions += 1

            parity_pct = (match_actions / H) * 100.0 if H > 0 else 100.0

            cost_dir = resp_dir.plannedTrajectory[-1].stepCost if resp_dir.plannedTrajectory else 0.0
            cost_surr = resp_surr.plannedTrajectory[-1].stepCost if resp_surr.plannedTrajectory else 0.0

            row = {
                "grid_id": grid_id,
                "horizon": H,
                "direct": {
                    "physical_solves": resp_dir.physicalSolveCount,
                    "median_ms": round(float(np.median(latencies_dir)), 2),
                    "p90_ms": round(float(np.percentile(latencies_dir, 90)), 2),
                    "feasible": resp_dir.isFeasible,
                    "terminal_cost": cost_dir,
                },
                "surrogate_integrated": {
                    "surrogate_evaluations": resp_surr.surrogateEvaluationCount,
                    "surrogate_fallbacks": resp_surr.surrogateFallbackCount,
                    "surrogate_pruned": resp_surr.surrogatePrunedCount,
                    "physical_solves": resp_surr.physicalSolveCount,
                    "solve_reduction_pct": round(
                        (1.0 - resp_surr.physicalSolveCount / max(1, resp_dir.physicalSolveCount)) * 100.0, 1
                    ),
                    "median_ms": round(float(np.median(latencies_surr)), 2),
                    "p90_ms": round(float(np.percentile(latencies_surr, 90)), 2),
                    "feasible": resp_surr.isFeasible,
                    "terminal_cost": cost_surr,
                },
                "trajectory_parity_pct": round(parity_pct, 1),
                "feasible_lost": False if (resp_dir.isFeasible == resp_surr.isFeasible) else True,
            }
            results.append(row)

            print(f"Horizon H={H:2d}:")
            print(
                f"  Direct: Solves={row['direct']['physical_solves']:4d} | "
                f"Med={row['direct']['median_ms']:6.1f}ms | P90={row['direct']['p90_ms']:6.1f}ms | Feas={row['direct']['feasible']}"
            )
            print(
                f"  Surr:   Solves={row['surrogate_integrated']['physical_solves']:4d} (Pruned={row['surrogate_integrated']['surrogate_pruned']:4d}, -{row['surrogate_integrated']['solve_reduction_pct']}%) | "
                f"Med={row['surrogate_integrated']['median_ms']:6.1f}ms | P90={row['surrogate_integrated']['p90_ms']:6.1f}ms | Feas={row['surrogate_integrated']['feasible']}"
            )
            print(
                f"  Parity: {row['trajectory_parity_pct']}% matching actions | Feasible candidate lost: {row['feasible_lost']}"
            )

    out_path = Path("scratch") / "benchmark_step5a_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved benchmark results to {out_path}")


if __name__ == "__main__":
    asyncio.run(run_benchmark())
