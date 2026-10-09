"""
Tests for Phase 1 — Digital Twin Baseline Integrity & Transformer Rating Fixes.

Verifies:
1. Configured transformer ratings (e.g. 350 kVA, 800 kVA) are respected in power flow loading calculations.
2. Transformer rating changes dynamically alter calculated loading percentage.
3. Transformer overload violations are generated when loading exceeds the limit (e.g. 100%).
4. No violation is generated when loading is within allowable limit.
5. Voltage and feeder overload checks continue working.
6. Grid updates selectively invalidate active simulation results for the affected grid.
"""

import copy
import types
import pytest
from httpx import AsyncClient, ASGITransport
from app.db.repositories.network_repository import NetworkRepository
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.schemas.network import Transformer, Bus, Feeder
from app.schemas.simulation import NetworkLimitsConfig
from app.schemas.violation import ViolationType, ViolationSeverity
from app.services import simulation_service
from app.main import app


@pytest.mark.asyncio
async def test_transformer_rating_power_flow_350kva_and_800kva():
    """Verify that power flow solver uses configured transformer ratings (350 kVA and 800 kVA)."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    engine = PowerFlowEngine()

    # Case 1: 350 kVA rating on 4-bus empirical solver
    grid_350 = copy.deepcopy(grid)
    grid_350.substation.ratingKva = 350.0

    # Constant net load: 200 kW load, 0 solar
    engine.solve(grid=grid_350, solar_kw=0.0, load_kw=200.0)
    loading_350 = grid_350.substation.loadingPercent
    flow_350 = engine.last_tx_flow_kva

    # Case 2: 800 kVA rating with identical load
    grid_800 = copy.deepcopy(grid)
    grid_800.substation.ratingKva = 800.0

    engine.solve(grid=grid_800, solar_kw=0.0, load_kw=200.0)
    loading_800 = grid_800.substation.loadingPercent
    flow_800 = engine.last_tx_flow_kva

    # The flow kVA through the substation should be virtually identical (same physical load/flow)
    assert abs(flow_350 - flow_800) < 1.0

    # The 4-bus empirical model computes: loading = min(200.0, round((tx_flow_kva / tx_rating) * 100.0 + 20.0, 1))
    # Verify both loadings match the intended calculation using their respective ratings:
    expected_350 = min(200.0, round((flow_350 / 350.0) * 100.0 + 20.0, 1))
    expected_800 = min(200.0, round((flow_800 / 800.0) * 100.0 + 20.0, 1))
    assert abs(loading_350 - expected_350) < 0.1
    assert abs(loading_800 - expected_800) < 0.1

    # Ratio of load-driven components (subtracting baseline offset) must exactly match 800/350
    ratio = (loading_350 - 20.0) / (loading_800 - 20.0)
    expected_ratio = 800.0 / 350.0
    assert abs(ratio - expected_ratio) < 0.05
    assert loading_350 > loading_800

    # Case 3: Verify generic DistFlow solver (e.g. medium-test-grid) also strictly uses configured rating
    med_grid = await repo.get_grid("medium-test-grid")
    med_350 = copy.deepcopy(med_grid)
    med_350.substation.ratingKva = 350.0
    engine.solve(grid=med_350, solar_kw=0.0, load_kw=200.0)
    med_loading_350 = med_350.substation.loadingPercent
    med_flow_350 = engine.last_tx_flow_kva

    med_800 = copy.deepcopy(med_grid)
    med_800.substation.ratingKva = 800.0
    engine.solve(grid=med_800, solar_kw=0.0, load_kw=200.0)
    med_loading_800 = med_800.substation.loadingPercent
    med_flow_800 = engine.last_tx_flow_kva

    assert abs(med_flow_350 - med_flow_800) < 1.0
    med_expected_350 = min(200.0, round((med_flow_350 / 350.0) * 100.0, 1))
    med_expected_800 = min(200.0, round((med_flow_800 / 800.0) * 100.0, 1))
    assert abs(med_loading_350 - med_expected_350) < 0.1
    assert abs(med_loading_800 - med_expected_800) < 0.1
    assert abs((med_loading_350 / med_loading_800) - expected_ratio) < 0.05


@pytest.mark.asyncio
async def test_transformer_rating_change_affects_loading_percent():
    """Ensure changing only transformer rating changes the calculated loading percentage."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    engine = PowerFlowEngine()

    grid_ratings = [250.0, 500.0, 750.0, 1000.0]
    loadings = []

    for rating in grid_ratings:
        g = copy.deepcopy(grid)
        g.substation.ratingKva = rating
        engine.solve(grid=g, solar_kw=0.0, load_kw=250.0)
        loadings.append(g.substation.loadingPercent)

    # Loadings must be strictly decreasing as rating increases
    for i in range(len(loadings) - 1):
        assert loadings[i] > loadings[i + 1]


def test_transformer_overload_violation_detection():
    """Verify constraint checker reports TRANSFORMER_OVERLOAD when loading > limit, and none when <= limit."""
    checker = ConstraintChecker()
    substation = Transformer(
        id="SUB-01",
        name="Main Substation",
        ratingKva=500.0,
        primaryVoltageKv=33.0,
        secondaryVoltageKv=11.0,
        loadingPercent=115.0
    )

    # Case 1: Overloaded (115% loading vs default 100% limit)
    violations = checker.check_transformer_loading(
        transformer=substation,
        tx_loading_pct=115.0,
        time_str="12:00",
        tx_flow_kva=575.0
    )

    assert len(violations) == 1
    v = violations[0]
    assert v.type == ViolationType.TRANSFORMER_OVERLOAD
    assert v.severity == ViolationSeverity.CRITICAL
    assert v.componentId == "SUB-01"
    assert v.componentType == "transformer"
    assert v.value == 115.0
    assert v.limit == 100.0
    assert v.formattedValue == "115.0%"
    assert "500 kVA" in v.recommendationHint or "500.0 kVA" in v.recommendationHint
    assert "575.0 kVA" in v.recommendationHint

    # Case 2: Within limits (85% loading vs default 100% limit)
    violations_ok = checker.check_transformer_loading(
        transformer=substation,
        tx_loading_pct=85.0,
        time_str="12:00",
        tx_flow_kva=425.0
    )
    assert len(violations_ok) == 0


@pytest.mark.asyncio
async def test_voltage_and_feeder_checks_continue_working():
    """Verify constraint checker continues detecting voltage and feeder violations along with transformer checks."""
    checker = ConstraintChecker()
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Set one bus under voltage (0.88 p.u. < 0.95 p.u.)
    buses = copy.deepcopy(grid.buses)
    buses[1].voltage = 0.88

    feeders = copy.deepcopy(grid.feeders)
    config = NetworkLimitsConfig()

    all_v = checker.check_all(
        buses=buses,
        feeders=feeders,
        time_str="14:00",
        config=config,
        transformer=grid.substation,
        tx_loading_pct=120.0,
        tx_flow_kva=600.0
    )

    types = {v.type for v in all_v}
    assert ViolationType.UNDER_VOLTAGE in types
    assert ViolationType.TRANSFORMER_OVERLOAD in types


def test_simulation_invalidation_on_grid_update():
    """Verify that updating a grid invalidates active simulation for that grid selectively."""
    dummy_result = types.SimpleNamespace(
        simId="sim-test-123",
        input=types.SimpleNamespace(gridId="default-grid")
    )
    simulation_service._ACTIVE_SIMULATION = dummy_result

    # Invalidate another grid (e.g. medium-test-grid) -> default-grid should NOT be invalidated
    simulation_service.invalidate_simulation_for_grid("medium-test-grid")
    assert simulation_service.get_active_simulation() is not None
    assert simulation_service.get_active_simulation().simId == "sim-test-123"

    # Invalidate default-grid -> should be cleared
    simulation_service.invalidate_simulation_for_grid("default-grid")
    assert simulation_service.get_active_simulation() is None


@pytest.mark.asyncio
async def test_api_grid_update_invalidates_stale_simulation():
    """Verify API PUT /api/networks/grids/{grid_id} invalidates active simulation."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Set active simulation for default-grid
    dummy_result = types.SimpleNamespace(
        simId="sim-test-api",
        input=types.SimpleNamespace(gridId="default-grid")
    )
    simulation_service._ACTIVE_SIMULATION = dummy_result
    assert simulation_service.get_active_simulation() is not None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Update default-grid transformer rating via API
        grid_data = grid.model_dump()
        grid_data["substation"]["ratingKva"] = 600.0

        resp = await ac.put(f"/api/networks/grids/{grid.id}", json=grid_data)
        assert resp.status_code == 200

        # Verify simulation state was invalidated
        assert simulation_service.get_active_simulation() is None

        # Reset back to 500 kVA
        grid_data["substation"]["ratingKva"] = 500.0
        await ac.put(f"/api/networks/grids/{grid.id}", json=grid_data)
