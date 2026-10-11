import asyncio
import time
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path("backend")))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController, SequentialState
from app.schemas.sequential_control import SequentialControlRequest, SequentialForecastPoint
from app.engine.power_flow import PowerFlowEngine
from app.engine.surrogate_screening import SurrogateScreeningEngine

def make_forecast(steps: int) -> list:
    points = []
    for i in range(steps):
        h = (12 + (i * 15) // 60) % 24
        m = (i * 15) % 60
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

async def run_breakdown():
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    
    print("=== PROFILING RUNTIME COMPONENTS (default-grid, H=24) ===")
    
    # 1. Model Loading
    surrogate_engine = SurrogateScreeningEngine.get_instance()
    t0 = time.perf_counter()
    surrogate_engine.reset_instance()
    surr = SurrogateScreeningEngine.get_instance()
    payload = surr.get_model("default-grid")
    t_load = (time.perf_counter() - t0) * 1000.0
    print(f"1. Model Loading (cold load): {t_load:.2f} ms")
    
    # Cached model load
    t0 = time.perf_counter()
    _ = surr.get_model("default-grid")
    t_load_cached = (time.perf_counter() - t0) * 1000.0
    print(f"   Model Loading (cached): {t_load_cached:.4f} ms")
    
    # 2. Candidate Generation (24 steps x 3 parents)
    ctrl = SequentialController(grid=grid, use_surrogate_screening=False)
    state = ctrl.initialize_state("12:00", 60.0)
    t0 = time.perf_counter()
    n_gen = 0
    for _ in range(24 * 3):
        candidates = ctrl.generate_candidate_controls(state, 100.0, 50.0)
        n_gen += len(candidates)
    t_gen = (time.perf_counter() - t0) * 1000.0
    print(f"2. Candidate Generation (24 steps, 72 parent evaluations, {n_gen} candidates total): {t_gen:.2f} ms")
    
    # 3. Topology Validation
    t0 = time.perf_counter()
    for c in candidates:
        for _ in range(72):
            surr.validate_candidate_topology(c, grid)
    t_val = (time.perf_counter() - t0) * 1000.0
    print(f"3. Topology Validation ({n_gen} candidates total): {t_val:.2f} ms")
    
    # 4. Feature Preparation
    t0 = time.perf_counter()
    for _ in range(n_gen):
        _ = surr.build_feature_row(100.0, 50.0, 0.0, 0.0, False, 60.0, 250.0, 500.0)
    t_feat = (time.perf_counter() - t0) * 1000.0
    print(f"4. Feature Preparation ({n_gen} rows): {t_feat:.2f} ms")
    
    # 5. Surrogate Predictions
    model = payload["model"]
    X = np.ones((21, 10))
    t0 = time.perf_counter()
    for _ in range(24):  # 24 steps
        _ = model.predict(X)
    t_pred = (time.perf_counter() - t0) * 1000.0
    print(f"5. Surrogate Model Prediction (24 steps x 21 candidates): {t_pred:.2f} ms")
    
    # 6. Physical Solver Calls
    pf = PowerFlowEngine()
    t0 = time.perf_counter()
    for _ in range(737):  # typical baseline solves for H=24
        pf.solve(grid, 100.0, 50.0)
    t_pf = (time.perf_counter() - t0) * 1000.0
    print(f"6. Physical Solver Execution (737 solves in baseline): {t_pf:.2f} ms ({t_pf/737:.4f} ms/solve)")
    
    # 7. Total End-to-End Direct vs Surrogate in Step 5A
    forecast = make_forecast(24)
    req_dir = SequentialControlRequest(
        gridId=grid.id, startTimestep="12:00", horizonSteps=24,
        forecastData=forecast, allowSurrogateScreening=False,
    )
    t0 = time.perf_counter()
    r_dir = SequentialController(grid=grid, use_surrogate_screening=False).plan(req_dir)
    t_dir_total = (time.perf_counter() - t0) * 1000.0
    
    req_surr = SequentialControlRequest(
        gridId=grid.id, startTimestep="12:00", horizonSteps=24,
        forecastData=forecast, allowSurrogateScreening=True,
    )
    t0 = time.perf_counter()
    r_surr = SequentialController(grid=grid, use_surrogate_screening=True).plan(req_surr)
    t_surr_total = (time.perf_counter() - t0) * 1000.0
    
    print(f"\n7. Total Sequential MPC Plan Latency (H=24):")
    print(f"   Direct Physical: {t_dir_total:.2f} ms (Physical Solves: {r_dir.physicalSolveCount})")
    print(f"   Step 5A Surrogate: {t_surr_total:.2f} ms (Physical Solves: {r_surr.physicalSolveCount}, Pruned: {r_surr.surrogatePrunedCount})")

asyncio.run(run_breakdown())
