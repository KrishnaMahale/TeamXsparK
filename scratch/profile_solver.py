import asyncio
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path("backend")))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.power_flow import PowerFlowEngine

async def profile_solver():
    repo = NetworkRepository()
    engine = PowerFlowEngine()
    
    for grid_id in ["default-grid", "medium-test-grid", "large-test-grid"]:
        grid = await repo.get_grid(grid_id)
        # Warmup
        engine.solve(grid, 100.0, 50.0)
        
        t0 = time.perf_counter()
        n = 500
        for _ in range(n):
            engine.solve(grid, 100.0, 50.0)
        dt_ms = (time.perf_counter() - t0) * 1000.0 / n
        print(f"{grid_id}: PowerFlowEngine.solve = {dt_ms:.4f} ms per call")

asyncio.run(profile_solver())
