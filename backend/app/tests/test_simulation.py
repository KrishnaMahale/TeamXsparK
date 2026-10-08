import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.simulation import SimulationInput, TimeSeriesSolarPoint, TimeSeriesLoadPoint


@pytest.mark.asyncio
async def test_full_simulation_api():
    input_data = SimulationInput(
        scenarioName="Test High Solar Simulation",
        installedSolarCapacityKw=250.0,
        currentSolarKw=240.0,
        peakLoadKw=180.0,
        currentLoadKw=120.0,
        solarTimeSeries=[
            TimeSeriesSolarPoint(id="s-12", time="12:00", solarKw=240.0),
            TimeSeriesSolarPoint(id="s-13", time="13:15", solarKw=250.0),
            TimeSeriesSolarPoint(id="s-18", time="18:00", solarKw=30.0),
        ],
        loadTimeSeries=[
            TimeSeriesLoadPoint(id="l-12", time="12:00", loadKw=110.0),
            TimeSeriesLoadPoint(id="l-13", time="13:15", loadKw=120.0),
            TimeSeriesLoadPoint(id="l-18", time="18:00", loadKw=160.0),
        ],
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Run simulation
        res = await ac.post("/api/simulations/run", json=input_data.model_dump())
        assert res.status_code == 200
        data = res.json()
        assert "timeStepResults" in data
        assert "13:15" in data["timeStepResults"]
        assert len(data["availableActions"]) == 4
        assert data["comparisonData"]["b3Voltage"]["before"] > 1.05

        # Single timestamp power-flow
        pf_res = await ac.post("/api/simulation/power-flow", json={"time": "13:15"})
        assert pf_res.status_code == 200
        assert pf_res.json()["converged"] is True

        # Corrective actions endpoint
        act_res = await ac.post("/api/simulation/corrective-actions", json={})
        assert act_res.status_code == 200
        assert len(act_res.json()["availableActions"]) == 4

        # Action execute endpoint
        exec_res = await ac.post("/api/simulation/actions/ACT-02/execute")
        assert exec_res.status_code == 200
        assert exec_res.json()["success"] is True

        # Scenarios endpoint
        sc_res = await ac.get("/api/scenarios")
        assert sc_res.status_code == 200
        assert len(sc_res.json()) >= 5

        # Grid Network endpoint
        net_res = await ac.get("/api/grid/network")
        assert net_res.status_code == 200
        assert len(net_res.json()["buses"]) == 4

        # Forecast endpoint
        fc_res = await ac.get("/api/forecast/timeseries?horizon=24")
        assert fc_res.status_code == 200
        assert len(fc_res.json()["dataPoints"]) in [24, 96]

        # Report generate endpoint
        rep_res = await ac.post("/api/reports/generate", json={"scenarioName": "High Solar", "simulationTime": "13:15"})
        assert rep_res.status_code == 200
        assert rep_res.json()["initialViolations"] == 2
