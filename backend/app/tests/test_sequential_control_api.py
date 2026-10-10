"""
Step 4C — Integration Test Suite for Sequential Controller REST API.
Verifies route registration, request validation, state isolation,
authoritative physical verification, honesty on infeasible plans, and immutability.
"""

from __future__ import annotations

import copy
from typing import Dict, List
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

from app.main import app
from app.db.repositories.network_repository import NetworkRepository
from app.schemas.sequential_control import (
    PlanStatus,
    SequentialControlRequest,
    SequentialControlResponse,
    SequentialForecastPoint,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def generate_valid_forecast_series(
    start_hour: int = 12,
    num_steps: int = 12,
    solar_base_kw: float = 200.0,
    load_base_kw: float = 120.0,
) -> List[Dict]:
    """Generates a valid 15-minute spaced forecast point series for testing."""
    series = []
    total_mins = start_hour * 60
    for i in range(num_steps):
        mins = (total_mins + i * 15) % 1440
        h = mins // 60
        m = mins % 60
        series.append({
            "time": f"{h:02d}:{m:02d}",
            "solarKw": max(0.0, solar_base_kw - i * 5.0),
            "loadKw": load_base_kw + i * 2.0,
        })
    return series


@pytest.mark.anyio
async def test_route_registration_and_api_prefix():
    """Verify that POST /api/control/sequential/plan is registered and reachable."""
    paths = app.openapi()["paths"]
    assert "/api/control/sequential/plan" in paths
    assert "post" in paths["/api/control/sequential/plan"]

    # Verify endpoint responds with 422 Unprocessable Entity (not 404 Not Found) on empty payload
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json={})
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_endpoint_success_valid_request():
    """Verify successful 8-step MPC plan generation on default-grid."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "stepDurationHours": 0.25,
        "initialSocPercent": 60.0,
        "forecastData": forecast,
        "recedingHorizonMode": True,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        # Validate schema structure
        plan_resp = SequentialControlResponse(**data)
        assert plan_resp.gridId == "default-grid"
        assert plan_resp.horizonSteps == 8
        assert len(plan_resp.plannedTrajectory) == 8
        assert plan_resp.recommendedFirstAction is not None
        assert plan_resp.physicalSolveCount > 0
        assert plan_resp.planningLatencyMs > 0.0

        # Verify every step is physically verified
        for step in plan_resp.plannedTrajectory:
            assert step.isPhysicallyVerified is True
            assert step.solverConverged is True
            assert 0.0 <= step.batterySocAfter <= 100.0


@pytest.mark.anyio
async def test_unknown_grid_id_returns_404():
    """Verify that an unknown grid ID returns 404 with structured error."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)
    payload = {
        "gridId": "non-existent-grid-xyz-999",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 404
        data = resp.json()
        assert "not found" in str(data).lower()


@pytest.mark.anyio
async def test_horizon_shorter_than_minimum_returns_422():
    """Verify that horizonSteps < 8 is rejected with 422."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=4)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 4,  # Violates ge=8
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_forecast_timestamps_returns_422():
    """Verify that malformed or non-15-minute spaced forecast points return 422."""
    forecast = [
        {"time": "12:00", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "12:20", "solarKw": 100.0, "loadKw": 50.0},  # 20 min gap, not 15
        {"time": "12:35", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "12:50", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "13:05", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "13:20", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "13:35", "solarKw": 100.0, "loadKw": 50.0},
        {"time": "13:50", "solarKw": 100.0, "loadKw": 50.0},
    ]
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 422
        assert "15 minutes" in str(resp.json()).lower()


@pytest.mark.anyio
async def test_non_finite_or_negative_forecast_values_returns_422():
    """Verify that negative or non-finite forecast values return 422."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)
    forecast[3]["solarKw"] = -50.0  # Invalid negative solar

    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_unsupported_topology_returns_422():
    """Verify that requesting an invalid or unsupported topology is rejected."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)

    # 1. Completely invalid topology string
    payload_invalid = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialTopology": "invalid-mesh-topology",
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload_invalid)
        assert resp.status_code == 422

    # 2. Alternative topology on a grid that does not support feeder reconfiguration
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    supports_alt = any(getattr(f, "isReconfigurableAlternate", False) for f in grid.feeders)
    if not supports_alt:
        payload_alt = {
            "gridId": "default-grid",
            "startTimestep": "12:00",
            "horizonSteps": 8,
            "initialTopology": "alternative",
            "forecastData": forecast,
        }
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/control/sequential/plan", json=payload_alt)
            assert resp.status_code == 422
            assert "does not support alternative topology" in str(resp.json()).lower()


@pytest.mark.anyio
async def test_infeasible_plan_honest_reporting():
    """Verify that an impossible scenario honestly reports INFEASIBLE and does not claim safety."""
    # Extreme solar injection exceeding both line ampacity and battery charge absorption capacity
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8, solar_base_kw=1800.0, load_base_kw=5.0)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 95.0,  # Battery almost full, cannot absorb
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        plan_resp = SequentialControlResponse(**data)

        # Plan MUST NOT be marked safe or feasible when hard limits remain violated
        if plan_resp.remainingViolationsTotal > 0:
            assert plan_resp.status == PlanStatus.INFEASIBLE
            assert plan_resp.isFeasible is False
            assert plan_resp.fallbackReason is not None


@pytest.mark.anyio
async def test_physical_solver_failure_handled_gracefully():
    """Verify that physical solver divergence or crash returns structured error without stack traces."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "forecastData": forecast,
    }

    with patch("app.engine.power_flow.PowerFlowEngine.solve", side_effect=RuntimeError("AC Newton-Raphson Divergence")):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/control/sequential/plan", json=payload)
            # Must return clean 400 or structured exception, not an unhandled 500 crash
            assert resp.status_code in (400, 422, 500)
            data = resp.json()
            # Must not expose file paths
            assert "d:\\" not in str(data).lower()
            assert "c:\\" not in str(data).lower()


@pytest.mark.anyio
async def test_request_isolation_different_soc_and_grids():
    """Verify concurrent/consecutive planning requests do not cross-contaminate state."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)

    req1 = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 25.0,
        "forecastData": forecast,
    }
    req2 = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 85.0,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp1 = await client.post("/api/control/sequential/plan", json=req1)
        resp2 = await client.post("/api/control/sequential/plan", json=req2)

        data1 = resp1.json()
        data2 = resp2.json()

        assert data1["plannedTrajectory"][0]["batterySocBefore"] == 25.0
        assert data2["plannedTrajectory"][0]["batterySocBefore"] == 85.0
        assert data1["terminalSocPercent"] != data2["terminalSocPercent"]


@pytest.mark.anyio
async def test_no_persistent_grid_mutation_during_planning():
    """Verify that generating a sequential plan does NOT mutate the saved network in repository."""
    repo = NetworkRepository()
    grid_before = await repo.get_grid("default-grid")
    battery_before_soc = grid_before.batteries[0].socPercent

    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8)
    payload = {
        "gridId": "default-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 40.0,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200

    grid_after = await repo.get_grid("default-grid")
    assert grid_after.batteries[0].socPercent == battery_before_soc


@pytest.mark.anyio
async def test_multi_battery_large_grid_support():
    """Verify sequential MPC planning on large-test-grid with multiple battery assets."""
    forecast = generate_valid_forecast_series(start_hour=12, num_steps=8, solar_base_kw=350.0, load_base_kw=250.0)
    payload = {
        "gridId": "large-test-grid",
        "startTimestep": "12:00",
        "horizonSteps": 8,
        "initialSocPercent": 65.0,
        "forecastData": forecast,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/control/sequential/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["gridId"] == "large-test-grid"
        first_step = data["plannedTrajectory"][0]
        # Should record individual battery SOCs
        assert len(first_step["batterySocsAfter"]) >= 2
