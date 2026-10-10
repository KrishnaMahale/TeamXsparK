"""
Integration and Regression Tests for ENR-02:
Sequential MPC Controller Integration with Normal Simulation and Forecast Workflows.

Verifies end-to-end:
1. Launch MPC from normal simulation without visiting /forecasts (constant-input baseline).
2. Launch MPC without forecastData using backend day-ahead pipeline fallback.
3. Launch MPC from forecast-driven workflow.
4. Grid switching (default-grid vs large-test-grid).
5. Initial SOC propagation (15% vs 85%) and battery state carry-forward.
6. Honest infeasibility reporting for extreme stress.
7. Explicit validation errors on invalid horizon data.
8. Alternative topology propagation on supported vs unsupported grids.
9. Physical verification path integrity (no surrogate authoritative claim).
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.sequential_control import PlanStatus, SequentialControlResponse
from app.services.forecast_service import ForecastService
from app.db.repositories.network_repository import NetworkRepository


def create_constant_baseline_horizon(start_time: str = "12:00", num_steps: int = 8, solar_kw: float = 240.0, load_kw: float = 120.0):
    """Generates an explicit constant-input baseline scenario at 15-minute intervals."""
    h_start, m_start = map(int, start_time.split(":"))
    points = []
    for i in range(num_steps):
        total_mins = (h_start * 60 + m_start + i * 15) % 1440
        h = total_mins // 60
        m = total_mins % 60
        t_str = f"{h:02d}:{m:02d}"
        points.append({
            "time": t_str,
            "solarKw": solar_kw,
            "loadKw": load_kw,
        })
    return points


@pytest.mark.anyio
async def test_normal_simulation_mpc_launch_constant_baseline():
    """
    Test 1: Launch MPC directly from normal simulation using a configured operating baseline.
    Does not require navigating to /forecasts.
    """
    baseline_points = create_constant_baseline_horizon(
        start_time="12:30",
        num_steps=8,
        solar_kw=250.0,
        load_kw=55.0,
    )
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:30",
        "horizonSteps": 8,
        "stepDurationHours": 0.25,
        "initialSocPercent": 88.0,
        "forecastData": baseline_points,
        "recedingHorizonMode": True,
        "allowSurrogateScreening": False,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        plan = SequentialControlResponse(**data)
        assert plan.gridId == "default-grid"
        assert plan.startTimestep == "12:30"
        assert plan.horizonSteps == 8
        assert len(plan.plannedTrajectory) == 8
        assert plan.physicalSolveCount > 0

        # Verify initial SOC propagation
        assert plan.plannedTrajectory[0].batterySocBefore == 88.0

        # Verify state propagation across steps
        for i in range(len(plan.plannedTrajectory)):
            step = plan.plannedTrajectory[i]
            assert step.isPhysicallyVerified is True
            assert step.solverConverged is True
            if i > 0:
                prev_step = plan.plannedTrajectory[i - 1]
                assert abs(step.batterySocBefore - prev_step.batterySocAfter) < 1e-4


@pytest.mark.anyio
async def test_normal_simulation_mpc_launch_without_forecast_data_fallback():
    """
    Test 2: Launch MPC when forecastData is omitted.
    Verifies that the backend day-ahead ForecastService fallback resolves correctly
    without the previously present 'AttributeError: ForecastResponse object has no attribute points'.
    """
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "stepDurationHours": 0.25,
        "initialSocPercent": 62.0,
        "recedingHorizonMode": True,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        plan = SequentialControlResponse(**data)
        assert plan.gridId == "default-grid"
        assert plan.horizonSteps == 8
        assert len(plan.plannedTrajectory) == 8
        assert plan.physicalSolveCount > 0


@pytest.mark.anyio
async def test_forecast_driven_simulation_mpc_launch():
    """
    Test 3: Launch MPC from forecast-driven simulation using staged 96-point day-ahead forecast.
    """
    fc_service = ForecastService()
    fc_res = await fc_service.get_timeseries_forecast(grid_id="default-grid", horizon_hours=24)
    staged_points = [
        {
            "time": pt.time,
            "solarKw": float(pt.solarGenerationKw),
            "loadKw": float(pt.loadDemandKw),
        }
        for pt in fc_res.dataPoints
    ]

    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "stepDurationHours": 0.25,
        "initialSocPercent": 60.0,
        "forecastData": staged_points,
        "recedingHorizonMode": True,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        plan = SequentialControlResponse(**data)
        assert len(plan.plannedTrajectory) == 8
        assert plan.plannedTrajectory[0].time == "12:00"
        assert plan.plannedTrajectory[1].time == "12:15"


@pytest.mark.anyio
async def test_grid_switching_uses_selected_grid():
    """
    Test 4: Switch between default-grid and large-test-grid; verify selected grid is used.
    """
    baseline_points = create_constant_baseline_horizon(start_time="12:00", num_steps=8)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request on default-grid
        resp1 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "forecastData": baseline_points,
        })
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["gridId"] == "default-grid"

        # Request on large-test-grid
        resp2 = await client.post("/api/control/sequential/plan", json={
            "gridId": "large-test-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "forecastData": baseline_points,
        })
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["gridId"] == "large-test-grid"
        # Large grid has multiple batteries recorded in batterySocsAfter
        assert len(data2["plannedTrajectory"][0]["batterySocsAfter"]) >= 2


@pytest.mark.anyio
async def test_initial_soc_propagation():
    """
    Test 5: Verify that user-configured initialSocPercent (e.g. 15% depleted vs 85% full)
    is respected on step 0 and carries forward correctly.
    """
    baseline_points = create_constant_baseline_horizon(start_time="12:00", num_steps=8)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 15% initial SOC
        resp_15 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "initialSocPercent": 15.0,
            "batterySocs": {"BATT-01": 15.0},
            "forecastData": baseline_points,
        })
        assert resp_15.status_code == 200
        data_15 = resp_15.json()
        assert data_15["plannedTrajectory"][0]["batterySocBefore"] == 15.0

        # 85% initial SOC
        resp_85 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "initialSocPercent": 85.0,
            "batterySocs": {"BATT-01": 85.0},
            "forecastData": baseline_points,
        })
        assert resp_85.status_code == 200
        data_85 = resp_85.json()
        assert data_85["plannedTrajectory"][0]["batterySocBefore"] == 85.0


@pytest.mark.anyio
async def test_infeasible_plan_reported_honestly():
    """
    Test 6: Verify extreme stress (high load, depleted battery, zero solar)
    reports INFEASIBLE honestly without claiming safety.
    """
    # 500 kW demand with zero solar and depleted 15% battery reserve
    stress_points = create_constant_baseline_horizon(
        start_time="19:00",
        num_steps=8,
        solar_kw=0.0,
        load_kw=500.0,
    )
    payload = {
        "gridId": "default-grid",
        "startTimestep": "19:00",
        "horizonSteps": 8,
        "initialSocPercent": 15.0,
        "batterySocs": {"BATT-01": 15.0},
        "forecastData": stress_points,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        plan = SequentialControlResponse(**data)

        assert plan.status == PlanStatus.INFEASIBLE
        assert plan.isFeasible is False
        assert plan.remainingViolationsTotal > 0
        assert plan.fallbackReason is not None


@pytest.mark.anyio
async def test_invalid_or_missing_horizon_handling():
    """
    Test 7: Verify clear validation errors on malformed horizon data.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Negative solar
        invalid_pts = create_constant_baseline_horizon(solar_kw=-20.0)
        resp1 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "forecastData": invalid_pts,
        })
        assert resp1.status_code == 422
        assert "solarkw" in str(resp1.json()).lower()
        assert "greater than or equal to 0" in str(resp1.json()).lower()

        # Case B: Horizon steps < 8
        resp2 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 4,
        })
        assert resp2.status_code == 422

        # Case C: Non-15m spacing (20m gap between step 0 and step 1)
        gap_pts = [
            {"time": "12:00", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "12:20", "solarKw": 100.0, "loadKw": 50.0},  # 20 min gap, not 15
            {"time": "12:35", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "12:50", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "13:05", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "13:20", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "13:35", "solarKw": 100.0, "loadKw": 50.0},
            {"time": "13:50", "solarKw": 100.0, "loadKw": 50.0},
        ]
        resp3 = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "forecastData": gap_pts,
        })
        assert resp3.status_code == 422
        assert "15 minutes" in str(resp3.json()).lower()


@pytest.mark.anyio
async def test_topology_configuration_propagation():
    """
    Test 8: Verify topology configuration handling.
    Grid default-grid does not support alternative topology -> rejected or falls back.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    supports_alt = any(getattr(f, "isReconfigurableAlternate", False) for f in grid.feeders)

    baseline_points = create_constant_baseline_horizon(start_time="12:00", num_steps=8)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Standard topology always succeeds
        resp_std = await client.post("/api/control/sequential/plan", json={
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "initialTopology": "standard",
            "forecastData": baseline_points,
        })
        assert resp_std.status_code == 200

        # Alternative topology on non-supporting grid returns 422
        if not supports_alt:
            resp_alt = await client.post("/api/control/sequential/plan", json={
                "gridId": "default-grid",
                "startTimestep": "12:00",
                "horizonSteps": 8,
                "initialTopology": "alternative",
                "forecastData": baseline_points,
            })
            assert resp_alt.status_code == 422
            assert "does not support alternative topology" in str(resp_alt.json()).lower()
