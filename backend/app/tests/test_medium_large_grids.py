import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repositories.network_repository import NetworkRepository
from app.schemas.network import GridNetwork
from app.schemas.simulation import (
    SimulationInput,
    TimeSeriesSolarPoint,
    TimeSeriesLoadPoint,
)


@pytest.mark.asyncio
async def test_grid_existence():
    """Verify that both medium-test-grid and large-test-grid exist in NetworkRepository."""
    repo = NetworkRepository()
    grids = await repo.get_all_grids()
    grid_ids = {g.id for g in grids}

    assert "medium-test-grid" in grid_ids, "medium-test-grid must exist in repository"
    assert "large-test-grid" in grid_ids, "large-test-grid must exist in repository"
    assert "default-grid" in grid_ids, "default-grid must remain in repository"


@pytest.mark.asyncio
async def test_schema_validity():
    """Verify that both grids parse cleanly as valid GridNetwork instances."""
    repo = NetworkRepository()
    med_grid = await repo.get_grid("medium-test-grid")
    lrg_grid = await repo.get_grid("large-test-grid")

    assert isinstance(med_grid, GridNetwork)
    assert isinstance(lrg_grid, GridNetwork)
    assert med_grid.name == "Medium Mixed Distribution Grid"
    assert lrg_grid.name == "Large Renewable Distribution Grid"


@pytest.mark.asyncio
async def test_topology_validity_medium_grid():
    """Verify topological integrity of medium-test-grid: all IDs, bus references, and feeder links."""
    repo = NetworkRepository()
    grid = await repo.get_grid("medium-test-grid")
    assert grid is not None

    bus_ids = {b.id for b in grid.buses}
    substation_id = grid.substation.id if grid.substation else "TX-MED"

    assert len(bus_ids) >= 5, f"Medium grid should have 5 buses, got {len(bus_ids)}"
    assert len(grid.feeders) >= 5, f"Medium grid should have at least 5 feeders, got {len(grid.feeders)}"
    assert len(grid.loads) >= 6, f"Medium grid should have at least 6 loads, got {len(grid.loads)}"
    assert len(grid.solarUnits) >= 3, f"Medium grid should have at least 3 solar units, got {len(grid.solarUnits)}"
    assert len(grid.batteries) >= 1, "Medium grid should have at least 1 battery"

    # Feeder references
    for f in grid.feeders:
        assert f.fromBus in bus_ids or f.fromBus == substation_id, f"Feeder {f.id} fromBus {f.fromBus} invalid"
        assert f.toBus in bus_ids or f.toBus == substation_id, f"Feeder {f.id} toBus {f.toBus} invalid"

    # Asset bus references
    for l in grid.loads:
        assert l.busId in bus_ids, f"Load {l.id} busId {l.busId} invalid"
    for s in grid.solarUnits:
        assert s.busId in bus_ids, f"SolarUnit {s.id} busId {s.busId} invalid"
    for b in grid.batteries:
        assert b.busId in bus_ids, f"Battery {b.id} busId {b.busId} invalid"


@pytest.mark.asyncio
async def test_topology_validity_large_grid():
    """Verify topological integrity of large-test-grid: all IDs, bus references, and feeder links."""
    repo = NetworkRepository()
    grid = await repo.get_grid("large-test-grid")
    assert grid is not None

    bus_ids = {b.id for b in grid.buses}
    substation_id = grid.substation.id if grid.substation else "TX-LRG"

    assert len(bus_ids) >= 10, f"Large grid should have at least 10 buses, got {len(bus_ids)}"
    assert len(grid.feeders) >= 10, f"Large grid should have at least 10 feeders, got {len(grid.feeders)}"
    assert len(grid.loads) >= 15, f"Large grid should have at least 15 loads, got {len(grid.loads)}"
    assert len(grid.solarUnits) >= 8, f"Large grid should have at least 8 solar units, got {len(grid.solarUnits)}"
    assert len(grid.batteries) >= 2, "Large grid should have at least 2 batteries"

    # Feeder references
    for f in grid.feeders:
        assert f.fromBus in bus_ids or f.fromBus == substation_id, f"Feeder {f.id} fromBus {f.fromBus} invalid"
        assert f.toBus in bus_ids or f.toBus == substation_id, f"Feeder {f.id} toBus {f.toBus} invalid"

    # Asset bus references
    for l in grid.loads:
        assert l.busId in bus_ids, f"Load {l.id} busId {l.busId} invalid"
    for s in grid.solarUnits:
        assert s.busId in bus_ids, f"SolarUnit {s.id} busId {s.busId} invalid"
    for b in grid.batteries:
        assert b.busId in bus_ids, f"Battery {b.id} busId {b.busId} invalid"


@pytest.mark.asyncio
async def test_forecast_compatibility_medium_and_large_grids():
    """Verify that both grids produce 96 points with 15-minute resolution via the forecast API."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for gid in ["medium-test-grid", "large-test-grid"]:
            res = await ac.get(f"/api/forecast/timeseries?grid_id={gid}&target_date=2025-06-08&horizon=24")
            assert res.status_code == 200, f"Forecast failed for {gid}: {res.text}"
            data = res.json()

            assert len(data["dataPoints"]) == 96, f"Expected 96 forecast points for {gid}, got {len(data['dataPoints'])}"
            assert data["metrics"]["resolutionMinutes"] == 15
            assert data["dataPoints"][0]["time"] == "00:00"
            assert data["dataPoints"][95]["time"] == "23:45"


@pytest.mark.asyncio
async def test_grid_aware_scaling_across_all_three_grids():
    """Verify that forecast outputs scale accurately to each grid's installed capacities."""
    repo = NetworkRepository()
    default_grid = await repo.get_grid("default-grid")
    med_grid = await repo.get_grid("medium-test-grid")
    lrg_grid = await repo.get_grid("large-test-grid")

    cap_def = sum(s.capacityKw for s in default_grid.solarUnits)
    cap_med = sum(s.capacityKw for s in med_grid.solarUnits)
    cap_lrg = sum(s.capacityKw for s in lrg_grid.solarUnits)

    load_def = sum(l.powerKw for l in default_grid.loads)
    load_med = sum(l.powerKw for l in med_grid.loads)
    load_lrg = sum(l.powerKw for l in lrg_grid.loads)

    assert cap_med != cap_def and cap_lrg != cap_med, "Grids must have distinct solar capacities"
    assert load_med != load_def and load_lrg != load_med, "Grids must have distinct load ratings"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r_def = await ac.get("/api/forecast/timeseries?grid_id=default-grid&target_date=2025-06-08&horizon=24")
        r_med = await ac.get("/api/forecast/timeseries?grid_id=medium-test-grid&target_date=2025-06-08&horizon=24")
        r_lrg = await ac.get("/api/forecast/timeseries?grid_id=large-test-grid&target_date=2025-06-08&horizon=24")

        assert r_def.status_code == 200 and r_med.status_code == 200 and r_lrg.status_code == 200

        d_def = r_def.json()
        d_med = r_med.json()
        d_lrg = r_lrg.json()

        # Solar peak must not exceed installed capacity
        assert d_med["metrics"]["peakSolarKw"] <= cap_med + 0.1
        assert d_lrg["metrics"]["peakSolarKw"] <= cap_lrg + 0.1

        # Peak load must match grid total load
        assert abs(d_med["metrics"]["peakLoadKw"] - load_med) < 0.1
        assert abs(d_lrg["metrics"]["peakLoadKw"] - load_lrg) < 0.1

        # Solar peaks must reflect capacity ordering (e.g. large > medium)
        assert d_lrg["metrics"]["peakSolarKw"] > d_med["metrics"]["peakSolarKw"]


@pytest.mark.asyncio
async def test_determinism_medium_and_large_grids():
    """Verify that repeated forecast requests for medium and large grids return identical values."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for gid in ["medium-test-grid", "large-test-grid"]:
            res1 = await ac.get(f"/api/forecast/timeseries?grid_id={gid}&target_date=2025-06-08&horizon=24")
            res2 = await ac.get(f"/api/forecast/timeseries?grid_id={gid}&target_date=2025-06-08&horizon=24")
            assert res1.status_code == 200 and res2.status_code == 200

            pts1 = res1.json()["dataPoints"]
            pts2 = res2.json()["dataPoints"]

            for p1, p2 in zip(pts1, pts2):
                assert p1["predictedSolarKw"] == p2["predictedSolarKw"]
                assert p1["predictedLoadKw"] == p2["predictedLoadKw"]


@pytest.mark.asyncio
async def test_simulation_execution_medium_grid():
    """Verify that medium-test-grid executes 96-timestep simulation through NetworkEngine without error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        fc_res = await ac.get("/api/forecast/timeseries?grid_id=medium-test-grid&target_date=2025-06-08&horizon=24")
        assert fc_res.status_code == 200
        fc_data = fc_res.json()

        solar_pts = [
            TimeSeriesSolarPoint(id=f"s-{p['time']}", time=p["time"], solarKw=float(p["predictedSolarKw"]))
            for p in fc_data["dataPoints"]
        ]
        load_pts = [
            TimeSeriesLoadPoint(id=f"l-{p['time']}", time=p["time"], loadKw=float(p["predictedLoadKw"]))
            for p in fc_data["dataPoints"]
        ]

        sim_input = SimulationInput(
            gridId="medium-test-grid",
            scenarioName="Day-Ahead Forecast (medium-test-grid)",
            simulationDate="2025-06-08",
            timeResolution="15 minutes",
            simulationSource="forecast",
            installedSolarCapacityKw=fc_data["metrics"]["peakSolarKw"],
            solarTimeSeries=solar_pts,
            peakLoadKw=fc_data["metrics"]["peakLoadKw"],
            loadTimeSeries=load_pts,
        )

        sim_res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert sim_res.status_code == 200, sim_res.text
        sim_data = sim_res.json()

        assert len(sim_data["timeStepResults"]) == 96
        assert len(sim_data["availableActions"]) > 0


@pytest.mark.asyncio
async def test_simulation_execution_large_grid():
    """Verify that large-test-grid executes 96-timestep simulation and detects physical behavior."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        fc_res = await ac.get("/api/forecast/timeseries?grid_id=large-test-grid&target_date=2025-06-08&horizon=24")
        assert fc_res.status_code == 200
        fc_data = fc_res.json()

        solar_pts = [
            TimeSeriesSolarPoint(id=f"s-{p['time']}", time=p["time"], solarKw=float(p["predictedSolarKw"]))
            for p in fc_data["dataPoints"]
        ]
        load_pts = [
            TimeSeriesLoadPoint(id=f"l-{p['time']}", time=p["time"], loadKw=float(p["predictedLoadKw"]))
            for p in fc_data["dataPoints"]
        ]

        sim_input = SimulationInput(
            gridId="large-test-grid",
            scenarioName="Day-Ahead Forecast (large-test-grid)",
            simulationDate="2025-06-08",
            timeResolution="15 minutes",
            simulationSource="forecast",
            installedSolarCapacityKw=fc_data["metrics"]["peakSolarKw"],
            solarTimeSeries=solar_pts,
            peakLoadKw=fc_data["metrics"]["peakLoadKw"],
            loadTimeSeries=load_pts,
        )

        sim_res = await ac.post("/api/simulations/run", json=sim_input.model_dump())
        assert sim_res.status_code == 200, sim_res.text
        sim_data = sim_res.json()

        assert len(sim_data["timeStepResults"]) == 96
        # Large grid has 10 buses and complex load/solar distribution
        step_1300 = sim_data["timeStepResults"]["13:00"]
        assert len(step_1300["buses"]) == 10
        assert len(step_1300["feeders"]) == 12
        assert len(sim_data["availableActions"]) > 0


@pytest.mark.asyncio
async def test_existing_default_grid_regression():
    """Verify default-grid continues to operate normally across forecast and simulation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        fc_res = await ac.get("/api/forecast/timeseries?grid_id=default-grid&target_date=2025-06-08&horizon=24")
        assert fc_res.status_code == 200
        assert len(fc_res.json()["dataPoints"]) == 96

        sim_res = await ac.post("/api/simulations/run", json={
            "gridId": "default-grid",
            "scenarioName": "NORMAL_DAY",
        })
        assert sim_res.status_code == 200
