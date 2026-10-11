import asyncio
import copy
import math
import time
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np

sys.path.insert(0, str(Path("backend")))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController, SequentialState, TrajectoryCandidate
from app.schemas.sequential_control import SequentialControlRequest, SequentialForecastPoint, ControllerActionType, PlannedStepAction, PlanStatus
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.surrogate_screening import SurrogateScreeningEngine

def make_forecast(steps: int) -> List[SequentialForecastPoint]:
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

async def test_prototype():
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=False,
    )
    
    # 1. Direct baseline
    ctrl_dir = SequentialController(grid=grid, use_surrogate_screening=False)
    t0 = time.perf_counter()
    resp_dir = ctrl_dir.plan(req)
    t_dir = (time.perf_counter() - t0) * 1000.0
    
    print(f"BASELINE DIRECT:")
    print(f"  Latency: {t_dir:.2f} ms")
    print(f"  Physical solves: {resp_dir.physicalSolveCount}")
    print(f"  Cost: {resp_dir.plannedTrajectory[0].title if resp_dir.plannedTrajectory else None}")
    print(f"  Violations: {resp_dir.remainingViolationsTotal}")

asyncio.run(test_prototype())
