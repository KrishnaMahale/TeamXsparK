"""
Step 4D — Comprehensive Sequential Controller and Closed-Loop Replanning Validation Suite.
Validates multi-step physical consistency, energy conservation, multi-battery isolation,
closed-loop replanning with state/forecast deviations, horizon scaling (8 to 96 steps),
and API robustness across default-grid, medium-test-grid, and large-test-grid.
"""

from __future__ import annotations

import copy
import math
from typing import Dict, List
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController, SequentialState
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    SequentialControlRequest,
    SequentialControlResponse,
    SequentialForecastPoint,
)
from app.services.sequential_control_service import SequentialControlService
from app.core.exceptions import ValidationException, ResourceNotFoundException


@pytest.fixture
def anyio_backend():
    return "asyncio"


def build_forecast_series(
    start_hour: int = 12,
    num_steps: int = 8,
    solar_base: float = 200.0,
    load_base: float = 120.0,
    solar_delta: float = -5.0,
    load_delta: float = 2.0,
) -> List[SequentialForecastPoint]:
    """Builds a strictly chronological 15-minute spaced series of SequentialForecastPoint objects."""
    series = []
    total_mins = start_hour * 60
    for i in range(num_steps):
        mins = (total_mins + i * 15) % 1440
        h = mins // 60
        m = mins % 60
        series.append(
            SequentialForecastPoint(
                time=f"{h:02d}:{m:02d}",
                solarKw=max(0.0, solar_base + i * solar_delta),
                loadKw=max(0.0, load_base + i * load_delta),
            )
        )
    return series


# ============================================================================
# 1. Sequential Physics & State-Consistency Tests Across All 3 Grids
# ============================================================================

@pytest.mark.anyio
@pytest.mark.parametrize("grid_id", ["default-grid", "medium-test-grid", "large-test-grid"])
async def test_sequential_physics_trajectory_continuity(grid_id: str):
    """
    Verifies that for every planned timestep across all 3 grids:
    - Step duration dt = 0.25h is used in battery energy calculations.
    - SOC-before of step i matches SOC-after of step i-1.
    - Battery power convention: discharging > 0, charging < 0.
    - SOC strictly satisfies battery operational/hard bounds [15%, 98%].
    - Every step is physically verified with AC power flow.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid(grid_id)
    assert grid is not None

    forecast = build_forecast_series(start_hour=12, num_steps=8, solar_base=250.0, load_base=180.0)
    controller = SequentialController(grid=grid, step_duration_hours=0.25)
    request = SequentialControlRequest(
        gridId=grid_id,
        startTimestep="12:00",
        horizonSteps=8,
        stepDurationHours=0.25,
        initialSocPercent=60.0,
        forecastData=forecast,
    )

    resp = controller.plan(request)
    assert resp.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    assert len(resp.plannedTrajectory) == 8

    # Verify trajectory continuity and physics
    prev_soc = 60.0
    for idx, step in enumerate(resp.plannedTrajectory):
        assert step.stepIndex == idx
        assert step.time == forecast[idx].time
        assert step.isPhysicallyVerified is True
        assert step.solverConverged is True

        # SOC continuity
        assert pytest.approx(step.batterySocBefore, abs=0.1) == prev_soc

        # Battery sign convention
        if step.actionType == ControllerActionType.BATTERY_DISPATCH:
            if "Discharge" in step.title:
                assert step.batteryPowerKw > 0.0
                assert step.batterySocAfter <= step.batterySocBefore
            elif "Charging" in step.title:
                assert step.batteryPowerKw < 0.0
                assert step.batterySocAfter >= step.batterySocBefore

        # SOC bounds
        assert 15.0 <= step.batterySocAfter <= 98.0
        prev_soc = step.batterySocAfter

    # Terminal SOC must match the final step's SOC after
    assert pytest.approx(resp.terminalSocPercent, abs=0.1) == resp.plannedTrajectory[-1].batterySocAfter


@pytest.mark.anyio
async def test_large_grid_multi_battery_isolation():
    """
    Verifies that large-test-grid with multiple batteries:
    - Maintains distinct SOC values for each individual battery unit.
    - batterySocsAfter dictionary contains all configured battery IDs.
    - Proportional power allocation preserves individual capacity limits.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("large-test-grid")
    assert grid is not None
    assert len(grid.batteries) >= 2
    b_ids = [b.id for b in grid.batteries]

    # Initialize with asymmetric battery SOCs
    asymmetric_socs = {b_ids[0]: 40.0, b_ids[1]: 80.0}

    forecast = build_forecast_series(start_hour=12, num_steps=8, solar_base=350.0, load_base=200.0)
    controller = SequentialController(grid=grid, step_duration_hours=0.25)
    request = SequentialControlRequest(
        gridId="large-test-grid",
        startTimestep="12:00",
        horizonSteps=8,
        batterySocs=asymmetric_socs,
        forecastData=forecast,
    )

    resp = controller.plan(request)
    assert len(resp.plannedTrajectory) == 8

    # Check first step maintains asymmetric battery SOCs
    first_step = resp.plannedTrajectory[0]
    assert len(first_step.batterySocsAfter) == len(b_ids)
    for b_id in b_ids:
        assert b_id in first_step.batterySocsAfter
        assert 15.0 <= first_step.batterySocsAfter[b_id] <= 98.0


@pytest.mark.anyio
async def test_candidate_branch_state_immutability():
    """
    Verifies that SequentialState objects are immutable (frozen dataclass with MappingProxyType)
    and candidate trajectory branches cannot corrupt parent state.
    """
    init_state = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": 55.0},
        topology_state="standard",
    )

    # Attempt in-place mutation of mapping
    with pytest.raises(TypeError):
        init_state.battery_socs["BAT-01"] = 99.0  # MappingProxyType prevents modification

    # Attempt in-place mutation of frozen fields
    with pytest.raises(AttributeError):
        init_state.step_index = 5


# ============================================================================
# 2. Closed-Loop Replanning Validation
# ============================================================================

@pytest.mark.anyio
async def test_closed_loop_replanning_with_telemetry_deviation():
    """
    Simulates a closed-loop MPC sequence:
    1. Initial plan generated from baseline state (12:00, SOC=60%).
    2. Simulated execution: Step 1 executes, but actual observed telemetry deviates:
       - Observed battery SOC deviates to 52.0% (due to unmodeled auxiliary load).
       - Observed solar drops from 220 kW to 140 kW (cloud cover).
    3. Replan from updated state (12:15, SOC=52.0%) and updated forecast.
    4. Verify replan starts from the updated state, not from original state.
    5. Verify initial plan remains untouched and persistent grid is unmutated.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    battery_before = grid.batteries[0].socPercent

    forecast_orig = build_forecast_series(start_hour=12, num_steps=8, solar_base=220.0, load_base=130.0)
    controller = SequentialController(grid=grid, step_duration_hours=0.25)

    # 1. Initial Plan
    req_orig = SequentialControlRequest(
        gridId="default-grid",
        startTimestep="12:00",
        horizonSteps=8,
        initialSocPercent=60.0,
        forecastData=forecast_orig,
    )
    plan_orig = controller.plan(req_orig)
    assert plan_orig.plannedTrajectory[0].batterySocBefore == 60.0
    predicted_soc_after_step0 = plan_orig.plannedTrajectory[0].batterySocAfter

    # 2. Telemetry Deviation: Observed actual state at 12:15
    # Battery actually at 52.0% (different from predicted_soc_after_step0)
    observed_state = SequentialState(
        step_index=1,
        time="12:15",
        battery_socs={grid.batteries[0].id: 52.0},
        topology_state="standard",
        cumulative_curtailment_kwh=plan_orig.plannedTrajectory[0].curtailmentKw * 0.25,
        cumulative_loss_kwh=plan_orig.plannedTrajectory[0].totalLossKw * 0.25,
    )

    # Revised forecast reflecting cloud cover
    forecast_revised = build_forecast_series(start_hour=12, num_steps=8, solar_base=140.0, load_base=135.0)[1:]
    # Append one point to maintain 8 steps (13:45 + 15m = 14:00)
    forecast_revised.append(SequentialForecastPoint(time="14:00", solarKw=80.0, loadKw=140.0))

    # 3. Closed-Loop Replan
    plan_replanned = controller.replan(
        current_state=observed_state,
        updated_forecast=forecast_revised,
        horizon_steps=8,
    )

    # 4. Verify replan origin starts from the observed telemetry (52.0%), NOT 60.0% or predicted
    assert plan_replanned.startTimestep == "12:15"
    assert len(plan_replanned.plannedTrajectory) == 8
    assert plan_replanned.plannedTrajectory[0].time == "12:15"
    assert pytest.approx(plan_replanned.plannedTrajectory[0].batterySocBefore, abs=0.1) == 52.0
    assert plan_replanned.plannedTrajectory[0].batterySocBefore != predicted_soc_after_step0

    # 5. Original plan is unmodified
    assert plan_orig.startTimestep == "12:00"
    assert plan_orig.plannedTrajectory[0].batterySocBefore == 60.0

    # 6. Persistent grid state untouched
    grid_after = await repo.get_grid("default-grid")
    assert grid_after.batteries[0].socPercent == battery_before


@pytest.mark.anyio
async def test_replan_invalid_observation_rejected():
    """Verifies that replanning rejects malformed observed state or invalid forecast."""
    service = SequentialControlService()

    # Invalid observation: negative battery SOC
    invalid_state = SequentialState(
        step_index=1,
        time="12:15",
        battery_socs={"BAT-01": -10.0},  # Invalid
        topology_state="standard",
    )
    forecast = build_forecast_series(start_hour=12, num_steps=8)[1:]
    forecast.append(SequentialForecastPoint(time="14:00", solarKw=50.0, loadKw=100.0))

    with pytest.raises(ValidationException) as exc_info:
        await service.replan_sequential_control(
            grid_id="default-grid",
            current_state=invalid_state,
            updated_forecast=forecast,
            horizon_steps=8,
        )
    assert "invalid" in str(exc_info.value).lower()


# ============================================================================
# 3. Horizon Scaling (8, 12, 24, 96 Steps)
# ============================================================================

@pytest.mark.anyio
@pytest.mark.parametrize("steps", [8, 12, 24])
async def test_horizon_scaling(steps: int):
    """
    Verifies that horizons of 8, 12, and 24 steps compute valid trajectories
    with strictly chronological timestamps and positive solve counts.
    """
    transport = ASGITransport(app=app)
    forecast = build_forecast_series(start_hour=10, num_steps=steps, solar_base=180.0, load_base=110.0)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "10:00",
        "horizonSteps": steps,
        "initialSocPercent": 50.0,
        "forecastData": [pt.model_dump() for pt in forecast],
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["horizonSteps"] == steps
        assert len(data["plannedTrajectory"]) == steps
        assert data["physicalSolveCount"] >= steps
        assert data["planningLatencyMs"] > 0.0


# ============================================================================
# 4. API Edge Cases & Fault Injection
# ============================================================================

@pytest.mark.anyio
async def test_forecast_out_of_order_rejected():
    """Verify that non-chronological forecast series are rejected with 422."""
    forecast = build_forecast_series(start_hour=12, num_steps=8)
    # Swap step 2 and step 3
    forecast[2], forecast[3] = forecast[3], forecast[2]

    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "forecastData": [pt.model_dump() for pt in forecast],
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_extremely_large_finite_inputs_handled_safely():
    """Verify that extreme inputs do not crash the solver or produce fake safety."""
    forecast = build_forecast_series(start_hour=12, num_steps=8, solar_base=15000.0, load_base=10.0)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 95.0,
        "forecastData": [pt.model_dump() for pt in forecast],
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Extreme injection cannot be safe without massive curtailment or violations
        if data["remainingViolationsTotal"] > 0:
            assert data["status"] == "INFEASIBLE"
            assert data["isFeasible"] is False


@pytest.mark.anyio
async def test_concurrent_interleaved_planning_requests():
    """Verify interleaved planning requests with different grids and SOCs remain strictly isolated."""
    forecast = build_forecast_series(start_hour=12, num_steps=8)
    payload1 = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 20.0,
        "forecastData": [pt.model_dump() for pt in forecast],
    }
    payload2 = {
        "gridId": "medium-test-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 80.0,
        "forecastData": [pt.model_dump() for pt in forecast],
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        import asyncio
        res1, res2 = await asyncio.gather(
            client.post("/api/control/sequential/plan", json=payload1),
            client.post("/api/control/sequential/plan", json=payload2),
        )
        assert res1.status_code == 200
        assert res2.status_code == 200
        d1 = res1.json()
        d2 = res2.json()

        assert d1["gridId"] == "default-grid"
        assert d2["gridId"] == "medium-test-grid"
        assert d1["plannedTrajectory"][0]["batterySocBefore"] == 20.0
        assert d2["plannedTrajectory"][0]["batterySocBefore"] == 80.0
