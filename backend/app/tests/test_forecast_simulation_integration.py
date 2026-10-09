import pytest
import math
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.simulation import (
    SimulationInput,
    TimeSeriesSolarPoint,
    TimeSeriesLoadPoint,
    NetworkLimitsConfig,
    BatteryStorageConfig,
)
from app.db.repositories.network_repository import initialize_default_grid


def make_96_times() -> list[str]:
    return [f"{h:02d}:{m:02d}" for h in range(24) for m in (0, 15, 30, 45)]


def make_synthetic_forecast_points(grid_solar_cap: float = 350.0, grid_peak_load: float = 270.0):
    times = make_96_times()
    solar_points = []
    load_points = []

    for idx, t in enumerate(times):
        h, m = map(int, t.split(":"))
        t_float = h + m / 60.0

        # Solar profile (diurnal bell curve peaking at 12:45 - 13:00)
        if 6.0 <= t_float <= 18.5:
            sun_factor = math.sin(((t_float - 6.0) / 12.5) * math.pi)
            s_val = round(grid_solar_cap * 0.85 * max(0.0, sun_factor), 2)
        else:
            s_val = 0.0

        # Load profile (residential dual-peak)
        load_factor = (
            0.35
            + 0.25 * math.exp(-((t_float - 10.0) ** 2) / 8.0)
            + 0.40 * math.exp(-((t_float - 19.5) ** 2) / 8.0)
        )
        l_val = round(grid_peak_load * min(1.0, max(0.2, load_factor)), 2)

        solar_points.append(TimeSeriesSolarPoint(id=f"solar-{t}", time=t, solarKw=s_val))
        load_points.append(TimeSeriesLoadPoint(id=f"load-{t}", time=t, loadKw=l_val))

    return solar_points, load_points


@pytest.mark.asyncio
async def test_forecast_contains_96_points_and_simulation_receives_96():
    """Verify that a 96-point forecast produces exactly 96 simulation timesteps."""
    solar_pts, load_pts = make_synthetic_forecast_points()
    assert len(solar_pts) == 96
    assert len(load_pts) == 96

    sim_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=350.0,
        solarTimeSeries=solar_pts,
        peakLoadKw=270.0,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert res.status_code == 200, res.text
        data = res.json()

        step_results = data["timeStepResults"]
        assert len(step_results) == 96, f"Expected 96 timesteps, got {len(step_results)}"


@pytest.mark.asyncio
async def test_timestamp_preservation_and_exact_order():
    """Verify all 96 timestamps remain unaltered, in order, without shifting or dropping."""
    solar_pts, load_pts = make_synthetic_forecast_points()
    expected_times = make_96_times()

    sim_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=350.0,
        solarTimeSeries=solar_pts,
        peakLoadKw=270.0,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert res.status_code == 200
        step_results = res.json()["timeStepResults"]

        actual_times = list(step_results.keys())
        assert actual_times == expected_times, "Timestamps altered or out of order"

        # Check key checkpoint timestamps
        checkpoints = ["00:00", "06:00", "12:00", "13:15", "18:00", "23:45"]
        for cp in checkpoints:
            assert cp in step_results
            assert step_results[cp]["timestamp"] == cp


@pytest.mark.asyncio
async def test_solar_and_load_value_preservation():
    """Verify solar and load forecast inputs match simulation outputs without rescaling."""
    solar_pts, load_pts = make_synthetic_forecast_points()

    sim_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=350.0,
        solarTimeSeries=solar_pts,
        peakLoadKw=270.0,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert res.status_code == 200
        step_results = res.json()["timeStepResults"]

        for i, t in enumerate(make_96_times()):
            expected_solar = solar_pts[i].solarKw
            expected_load = load_pts[i].loadKw
            actual_solar = step_results[t]["totalGenerationKw"]
            actual_load = step_results[t]["totalDemandKw"]

            assert abs(actual_solar - expected_solar) < 1e-4, (
                f"Mismatch at {t}: input solar={expected_solar}, simulation solar={actual_solar}"
            )
            assert abs(actual_load - expected_load) < 1e-4, (
                f"Mismatch at {t}: input load={expected_load}, simulation load={actual_load}"
            )


@pytest.mark.asyncio
async def test_forecast_simulation_data_integrity_arbitrary_pattern():
    """Deterministic ramp pattern test detecting reversals, duplicate points, and shifts."""
    times = make_96_times()
    ramp_solar = [TimeSeriesSolarPoint(id=f"s-{t}", time=t, solarKw=float(i)) for i, t in enumerate(times)]
    ramp_load = [TimeSeriesLoadPoint(id=f"l-{t}", time=t, loadKw=float(100 + i)) for i, t in enumerate(times)]

    sim_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=350.0,
        solarTimeSeries=ramp_solar,
        peakLoadKw=200.0,
        loadTimeSeries=ramp_load,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert res.status_code == 200
        step_results = res.json()["timeStepResults"]

        for i, t in enumerate(times):
            assert step_results[t]["totalGenerationKw"] == float(i)
            assert step_results[t]["totalDemandKw"] == float(100 + i)


@pytest.mark.asyncio
async def test_determinism_across_repeated_runs():
    """Verify that running the same forecast-driven simulation twice yields identical results."""
    solar_pts, load_pts = make_synthetic_forecast_points()
    sim_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=350.0,
        solarTimeSeries=solar_pts,
        peakLoadKw=270.0,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res1 = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        res2 = await ac.post("/api/simulations/run", json=sim_input.model_dump())

        assert res1.status_code == 200
        assert res2.status_code == 200

        data1 = res1.json()
        data2 = res2.json()

        for t in make_96_times():
            step1 = data1["timeStepResults"][t]
            step2 = data2["timeStepResults"][t]

            assert step1["totalGenerationKw"] == step2["totalGenerationKw"]
            assert step1["totalDemandKw"] == step2["totalDemandKw"]
            assert step1["totalLossKw"] == step2["totalLossKw"]
            assert len(step1["violations"]) == len(step2["violations"])

            for b1, b2 in zip(step1["buses"], step2["buses"]):
                assert b1["id"] == b2["id"]
                assert b1["voltage"] == b2["voltage"]


@pytest.mark.asyncio
async def test_grid_aware_simulation_different_capacities():
    """Verify that predictions and simulations for two different grids reflect distinct capacities."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch real forecasts for both grids
        resp1 = await ac.get("/api/forecast/timeseries", params={
            "grid_id": "default-grid",
            "target_date": "2025-06-08",
            "horizon": 24,
        })
        resp2 = await ac.get("/api/forecast/timeseries", params={
            "grid_id": "DEFAULT_GRID",
            "target_date": "2025-06-08",
            "horizon": 24,
        })
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        data1 = resp1.json()
        data2 = resp2.json()

        # Grid A forecast != Grid B forecast
        peak1 = data1["metrics"]["peakSolarKw"]
        peak2 = data2["metrics"]["peakSolarKw"]
        assert peak1 != peak2, f"Grid A ({peak1}) should not equal Grid B ({peak2})"

        # 2. Build SimulationInput for Grid A
        solar_pts_a = [
            TimeSeriesSolarPoint(id=f"s-{p['time']}", time=p["time"], solarKw=float(p.get("predictedSolarKw", p.get("solarGenerationKw", 0.0))))
            for p in data1["dataPoints"]
        ]
        load_pts_a = [
            TimeSeriesLoadPoint(id=f"l-{p['time']}", time=p["time"], loadKw=float(p.get("predictedLoadKw", p.get("loadDemandKw", 0.0))))
            for p in data1["dataPoints"]
        ]
        input_a = SimulationInput(
            gridId="default-grid",
            scenarioName="Day-Ahead Forecast (2025-06-08)",
            simulationDate="2025-06-08",
            timeResolution="15 minutes",
            simulationSource="forecast",
            installedSolarCapacityKw=peak1,
            solarTimeSeries=solar_pts_a,
            peakLoadKw=data1["metrics"]["peakLoadKw"],
            loadTimeSeries=load_pts_a,
        )

        # 3. Build SimulationInput for Grid B
        solar_pts_b = [
            TimeSeriesSolarPoint(id=f"s-{p['time']}", time=p["time"], solarKw=float(p.get("predictedSolarKw", p.get("solarGenerationKw", 0.0))))
            for p in data2["dataPoints"]
        ]
        load_pts_b = [
            TimeSeriesLoadPoint(id=f"l-{p['time']}", time=p["time"], loadKw=float(p.get("predictedLoadKw", p.get("loadDemandKw", 0.0))))
            for p in data2["dataPoints"]
        ]
        input_b = SimulationInput(
            gridId="DEFAULT_GRID",
            scenarioName="Day-Ahead Forecast (2025-06-08)",
            simulationDate="2025-06-08",
            timeResolution="15 minutes",
            simulationSource="forecast",
            installedSolarCapacityKw=peak2,
            solarTimeSeries=solar_pts_b,
            peakLoadKw=data2["metrics"]["peakLoadKw"],
            loadTimeSeries=load_pts_b,
        )

        # 4. Run simulations for both
        sim_res_a = await ac.post("/api/simulations/run", json=input_a.model_dump())
        sim_res_b = await ac.post("/api/simulations/run", json=input_b.model_dump())
        assert sim_res_a.status_code == 200
        assert sim_res_b.status_code == 200

        sim_a = sim_res_a.json()
        sim_b = sim_res_b.json()

        # Midday 13:00 point index is 52 (13 * 4 = 52)
        idx_1300 = next(i for i, p in enumerate(data1["dataPoints"]) if p["time"] == "13:00")
        assert abs(sim_a["timeStepResults"]["13:00"]["totalGenerationKw"] - solar_pts_a[idx_1300].solarKw) < 1e-4
        assert abs(sim_b["timeStepResults"]["13:00"]["totalGenerationKw"] - solar_pts_b[idx_1300].solarKw) < 1e-4
        assert sim_a["timeStepResults"]["13:00"]["totalGenerationKw"] != sim_b["timeStepResults"]["13:00"]["totalGenerationKw"]


@pytest.mark.asyncio
async def test_invalid_forecast_point_count_rejected():
    """Verify that a forecast with fewer than 96 points is rejected with 422."""
    solar_pts, load_pts = make_synthetic_forecast_points()

    # Drop last 4 points -> 92 points
    invalid_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationSource="forecast",
        solarTimeSeries=solar_pts[:92],
        loadTimeSeries=load_pts[:92],
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=invalid_input.model_dump())
        assert res.status_code == 422
        assert "must contain 96 points" in res.text


@pytest.mark.asyncio
async def test_invalid_forecast_timestamps_rejected():
    """Verify that a forecast with non-15m intervals is rejected with 422."""
    times = make_96_times()
    solar_pts, load_pts = make_synthetic_forecast_points()

    # Tamper one timestamp: change 00:15 to 00:20
    solar_pts_bad = [
        TimeSeriesSolarPoint(id=p.id, time="00:20" if p.time == "00:15" else p.time, solarKw=p.solarKw)
        for p in solar_pts
    ]

    invalid_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationSource="forecast",
        solarTimeSeries=solar_pts_bad,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=invalid_input.model_dump())
        assert res.status_code == 422
        assert "not 15 minutes apart" in res.text


@pytest.mark.asyncio
async def test_missing_forecast_rejected():
    """Verify that missing/empty forecast data is rejected with 422."""
    empty_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationSource="forecast",
        solarTimeSeries=[],
        loadTimeSeries=[],
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=empty_input.model_dump())
        assert res.status_code == 422
        assert "Forecast data unavailable" in res.text


@pytest.mark.asyncio
async def test_direct_scenario_simulation_regression_path_a():
    """Verify that direct scenario simulation (Path A, e.g. NORMAL_DAY with 19 points) continues to work."""
    # Default SimulationInput uses default 19 points and simulationSource='scenario'
    scenario_input = SimulationInput(
        gridId="default-grid",
        scenarioName="High Solar + Low Load",
        simulationSource="scenario",
        installedSolarCapacityKw=250.0,
        peakLoadKw=180.0,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=scenario_input.model_dump())
        assert res.status_code == 200, res.text
        data = res.json()
        assert "timeStepResults" in data
        assert len(data["availableActions"]) > 0
        assert data["summary"]["scenarioName"] == "High Solar + Low Load"


@pytest.mark.asyncio
async def test_violation_propagation_under_stressed_forecast():
    """Verify that a forecast creating high solar injection produces expected physical violations."""
    solar_pts, load_pts = make_synthetic_forecast_points(grid_solar_cap=400.0, grid_peak_load=100.0)

    # Force very high midday solar generation to trigger overvoltage
    for p in solar_pts:
        if p.time in ("12:45", "13:00", "13:15"):
            p.solarKw = 380.0

    stressed_input = SimulationInput(
        gridId="default-grid",
        scenarioName="Day-Ahead Forecast (2026-09-25)",
        simulationDate="2026-09-25",
        timeResolution="15 minutes",
        simulationSource="forecast",
        installedSolarCapacityKw=250.0,
        solarTimeSeries=solar_pts,
        peakLoadKw=100.0,
        loadTimeSeries=load_pts,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/simulations/run", json=stressed_input.model_dump())
        assert res.status_code == 200
        data = res.json()

        midday_result = data["timeStepResults"]["13:15"]
        assert len(midday_result["violations"]) > 0, "Expected violations under heavy solar injection"
        # Verify violation structure matches standard schema
        viol = midday_result["violations"][0]
        assert "componentId" in viol
        assert "severity" in viol
        assert "value" in viol
        assert "limit" in viol


@pytest.mark.asyncio
async def test_live_forecast_to_simulation_end_to_end():
    """End-to-end: query /api/forecast/timeseries for 96 points, feed directly into /api/simulations/run."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch real ML forecast
        fc_res = await ac.get("/api/forecast/timeseries?horizon=24&target_date=2026-09-25&grid_id=default-grid")
        assert fc_res.status_code == 200
        fc_data = fc_res.json()
        assert len(fc_data["dataPoints"]) == 96

        # 2. Map directly into SimulationInput using predictedSolarKw and predictedLoadKw
        solar_pts = [
            TimeSeriesSolarPoint(
                id=f"solar-{pt['time']}",
                time=pt["time"],
                solarKw=float(pt.get("predictedSolarKw", pt.get("solarGenerationKw", 0.0))),
            )
            for pt in fc_data["dataPoints"]
        ]
        load_pts = [
            TimeSeriesLoadPoint(
                id=f"load-{pt['time']}",
                time=pt["time"],
                loadKw=float(pt.get("predictedLoadKw", pt.get("loadDemandKw", 0.0))),
            )
            for pt in fc_data["dataPoints"]
        ]

        peak_s = fc_data.get("metrics", {}).get("peakSolarKw", 350.0)
        peak_l = fc_data.get("metrics", {}).get("peakLoadKw", 200.0)

        sim_input = SimulationInput(
            gridId="default-grid",
            scenarioName="Day-Ahead Forecast (2026-09-25)",
            simulationDate="2026-09-25",
            timeResolution="15 minutes",
            simulationSource="forecast",
            installedSolarCapacityKw=peak_s,
            solarTimeSeries=solar_pts,
            peakLoadKw=peak_l,
            loadTimeSeries=load_pts,
        )

        # 3. Run simulation
        sim_res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert sim_res.status_code == 200
        sim_data = sim_res.json()

        # 4. Verify 96 simulation timesteps match forecast inputs
        assert len(sim_data["timeStepResults"]) == 96
        for pt in fc_data["dataPoints"]:
            t = pt["time"]
            expected_solar = float(pt.get("predictedSolarKw", pt.get("solarGenerationKw", 0.0)))
            expected_load = float(pt.get("predictedLoadKw", pt.get("loadDemandKw", 0.0)))
            assert abs(sim_data["timeStepResults"][t]["totalGenerationKw"] - expected_solar) < 1e-4
            assert abs(sim_data["timeStepResults"][t]["totalDemandKw"] - expected_load) < 1e-4
