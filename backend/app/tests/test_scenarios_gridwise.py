import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_scenarios_list_and_metadata():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/scenarios")
        assert res.status_code == 200
        scenarios = res.json()
        assert len(scenarios) >= 9

        scenario_ids = {s["id"] for s in scenarios}
        expected_ids = {
            "NORMAL_DAY",
            "HIGH_SOLAR",
            "EVENING_PEAK",
            "HIGH_SOLAR_LOW_LOAD",
            "EXTREME_INFEASIBLE",
            "STORM_CLOUD_RAMP",
            "EV_CHARGING_SURGE",
            "PHASE_UNBALANCE_PEAK",
            "NIGHT_QUIET",
        }
        assert expected_ids.issubset(scenario_ids)


@pytest.mark.asyncio
async def test_scenario_run_industrial():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Run High Solar on industrial grid
        res = await ac.post("/api/scenarios/HIGH_SOLAR/run?grid_type=industrial")
        assert res.status_code == 200
        data = res.json()
        assert data["gridType"] == "industrial"
        assert data["voltageMaxPu"] > 1.05
        assert data["initialViolations"] >= 1
        assert data["isFeasible"] is True
        assert len(data["availableActions"]) > 0


@pytest.mark.asyncio
async def test_scenario_run_infeasible():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Extreme Infeasible scenario
        res = await ac.post("/api/scenarios/EXTREME_INFEASIBLE/run?grid_type=industrial")
        assert res.status_code == 200
        data = res.json()
        assert data["isFeasible"] is False
        assert data["resolvedViolations"] == 0


@pytest.mark.asyncio
async def test_scenario_run_domestic_gridwise():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Run Phase Unbalance on domestic grid
        res = await ac.post("/api/scenarios/PHASE_UNBALANCE_PEAK/run?grid_type=domestic")
        assert res.status_code == 200
        data = res.json()
        assert data["gridType"] == "domestic"
        assert data["vufPercent"] is not None
        assert data["powerFlowResult"] is not None
        assert "houses" in data["powerFlowResult"]
