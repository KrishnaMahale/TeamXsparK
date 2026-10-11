"""
ENR-02 Regression Test Suite: Complete Integration of Rooftop Solar Array Demand & Generation.

Verifies:
1. Rooftop demand = 0, generation > 0.
2. Rooftop demand > 0, generation = 0.
3. Rooftop demand and generation both nonzero.
4. Both values zero.
5. Increasing rooftop demand affects the connected bus's electrical operating state where physically expected.
6. Increasing rooftop generation changes net injection according to the solver's sign convention.
7. Curtailment cannot exceed the targeted unit's available generation.
8. Rooftop load is not counted twice in the physical solver or forecast aggregation.
9. Default-grid results remain consistent with the established benchmark when rooftop demand is zero.
10. Custom-grid results correctly account for the rooftop component.
11. Single-Snapshot Dispatch and Sequential MPC agree on physical outputs for identical states and actions.
12. Violation counts and reports reflect the corrected physical results.
13. Unsupported surrogate configurations use the physical solver instead of falsely claiming validated screening.
14. Changing a rooftop unit's bus connection updates the electrical topology consistently.
"""

import copy
import pytest
import numpy as np

from app.db.repositories.network_repository import NetworkRepository, initialize_default_grid
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.actions import ActionEngine
from app.engine.sequential_controller import SequentialController
from app.schemas.sequential_control import ControllerActionType
from app.engine.surrogate_screening import SurrogateScreeningEngine, ScreeningStatus
from app.ml.forecast_pipeline import get_forecast_pipeline
from app.schemas.simulation import NetworkLimitsConfig
from app.schemas.battery import BatteryStorageConfig
from app.schemas.sequential_control import SequentialForecastPoint
from app.schemas.network import (
    GridNetwork, Bus, Feeder, SolarUnit, Load, Battery, Transformer,
    Position3D, BusConnectedAssets,
)


@pytest.fixture
def default_grid():
    return initialize_default_grid()


@pytest.fixture
def clean_benchmark_grid(default_grid):
    """Returns a default-grid clone with rooftop demand set to zero."""
    g = default_grid.model_copy(deep=True)
    for s in g.solarUnits:
        if s.isSolarRooftop:
            s.loadKw = 0.0
    return g


def create_isolated_grid():
    """Builds an isolated radial test grid for rigorous rooftop unit verification."""
    sub = Transformer(
        id="TX-ISO", name="Substation", ratingKva=500.0,
        primaryVoltageKv=33.0, secondaryVoltageKv=11.0, loadingPercent=50.0,
    )
    buses = [
        Bus(id="BUS-1", name="Slack Bus", voltage=1.02, loadKw=0.0, solarKw=0.0),
        Bus(id="BUS-2", name="Load Bus", voltage=1.00, loadKw=50.0, solarKw=0.0),
        Bus(id="BUS-3", name="Rooftop Bus", voltage=1.00, loadKw=0.0, solarKw=0.0),
    ]
    feeders = [
        Feeder(id="FEED-1", name="Main Feeder", fromBus="TX-ISO", toBus="BUS-1", capacityKw=500.0, loadingPercent=0.0, isSwitchClosed=True),
        Feeder(id="FEED-2", name="Branch 1-2", fromBus="BUS-1", toBus="BUS-2", capacityKw=300.0, loadingPercent=0.0, isSwitchClosed=True),
        Feeder(id="FEED-3", name="Branch 2-3", fromBus="BUS-2", toBus="BUS-3", capacityKw=200.0, loadingPercent=0.0, isSwitchClosed=True),
    ]
    loads = [
        Load(id="LOAD-CONV", name="Fixed Load", busId="BUS-2", powerKw=50.0),
    ]
    solar = [
        SolarUnit(
            id="ROOF-01", name="Residential Rooftop", busId="BUS-3",
            capacityKw=100.0, generationKw=50.0, loadKw=30.0, isSolarRooftop=True,
        )
    ]
    return GridNetwork(
        id="isolated-custom-grid",
        name="Isolated Rooftop Test Grid",
        gridConnectionStatus="connected",
        substation=sub,
        buses=buses,
        feeders=feeders,
        loads=loads,
        solarUnits=solar,
        batteries=[],
    )


# ---------------------------------------------------------------------------
# Test 1: Rooftop demand = 0, generation > 0
# ---------------------------------------------------------------------------
def test_1_rooftop_demand_zero_generation_positive(clean_benchmark_grid):
    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(
        grid=clean_benchmark_grid, solar_kw=248.0, load_kw=120.0, installed_solar_capacity_kw=250.0,
    )
    b3 = next(b for b in buses if b.id == "B3")
    f02 = next(f for f in feeders if f.id == "F-02")
    assert b3.solarKw > 0.0, "Generation must be active at B3"
    assert b3.voltage > 1.05, "Zero local demand with high solar creates overvoltage"
    assert f02.loadingPercent > 100.0, "Zero local demand forces reverse surplus into F-02"


# ---------------------------------------------------------------------------
# Test 2: Rooftop demand > 0, generation = 0
# ---------------------------------------------------------------------------
def test_2_rooftop_demand_positive_generation_zero():
    grid = create_isolated_grid()
    s = grid.solarUnits[0]
    s.loadKw = 50.0
    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(grid=grid, solar_kw=0.0, load_kw=100.0)
    b3 = next(b for b in buses if b.id == "BUS-3")
    assert b3.solarKw == 0.0
    assert b3.loadKw > 0.0, "Local demand must be allocated to BUS-3"
    assert b3.voltage < 1.02, "Load consumption without solar lowers voltage magnitude"


# ---------------------------------------------------------------------------
# Test 3: Rooftop demand and generation both nonzero
# ---------------------------------------------------------------------------
def test_3_rooftop_demand_and_generation_both_nonzero():
    grid = create_isolated_grid()
    s = grid.solarUnits[0]
    s.loadKw = 40.0
    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(grid=grid, solar_kw=80.0, load_kw=90.0)
    b3 = next(b for b in buses if b.id == "BUS-3")
    assert b3.solarKw > 0.0
    assert b3.loadKw > 0.0
    net_injection = b3.solarKw - b3.loadKw
    assert abs(net_injection) < 80.0, "Net injection must reflect simultaneous generation and local demand"


# ---------------------------------------------------------------------------
# Test 4: Both values zero
# ---------------------------------------------------------------------------
def test_4_both_values_zero():
    grid = create_isolated_grid()
    s = grid.solarUnits[0]
    s.loadKw = 0.0
    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(grid=grid, solar_kw=0.0, load_kw=50.0)
    b3 = next(b for b in buses if b.id == "BUS-3")
    assert b3.solarKw == 0.0
    assert b3.loadKw == 0.0, "When rooftop demand is zero and no other loads exist at bus, loadKw must be 0"


# ---------------------------------------------------------------------------
# Test 5: Increasing rooftop demand affects connected bus electrical operating state
# ---------------------------------------------------------------------------
def test_5_increasing_rooftop_demand_suppresses_voltage_and_loading(default_grid):
    pf = PowerFlowEngine()
    # Baseline with 0 rooftop demand
    g_0 = default_grid.model_copy(deep=True)
    g_0.solarUnits[1].loadKw = 0.0
    b_0, f_0, _, _ = pf.solve(g_0, solar_kw=248.0, load_kw=120.0)
    v_0 = next(b for b in b_0 if b.id == "B3").voltage
    load_f02_0 = next(f for f in f_0 if f.id == "F-02").loadingPercent

    # Increased rooftop demand to 60 kW
    g_60 = default_grid.model_copy(deep=True)
    g_60.solarUnits[1].loadKw = 60.0
    g_60.loads[1].powerKw = 20.0
    b_60, f_60, _, _ = pf.solve(g_60, solar_kw=248.0, load_kw=120.0)
    v_60 = next(b for b in b_60 if b.id == "B3").voltage
    load_f02_60 = next(f for f in f_60 if f.id == "F-02").loadingPercent

    assert v_60 <= v_0, f"Expected V_B3 to decrease with higher demand: {v_60} <= {v_0}"
    assert load_f02_60 <= load_f02_0, f"Expected F-02 loading to decrease with higher demand: {load_f02_60} <= {load_f02_0}"


# ---------------------------------------------------------------------------
# Test 6: Increasing rooftop generation changes net injection according to sign convention
# ---------------------------------------------------------------------------
def test_6_increasing_rooftop_generation_increases_net_injection(default_grid):
    pf = PowerFlowEngine()
    g = default_grid.model_copy(deep=True)
    b_low, _, _, _ = pf.solve(g, solar_kw=100.0, load_kw=120.0)
    b_high, _, _, _ = pf.solve(g, solar_kw=250.0, load_kw=120.0)

    v_low = next(b for b in b_low if b.id == "B3").voltage
    v_high = next(b for b in b_high if b.id == "B3").voltage
    s_low = next(b for b in b_low if b.id == "B3").solarKw
    s_high = next(b for b in b_high if b.id == "B3").solarKw

    assert s_high > s_low, "Solar allocation at B3 must rise with aggregate solar"
    assert v_high > v_low, "Voltage at B3 must rise as reverse solar injection increases"


# ---------------------------------------------------------------------------
# Test 7: Curtailment cannot exceed targeted unit available generation
# ---------------------------------------------------------------------------
def test_7_curtailment_cannot_exceed_available_unit_generation(default_grid):
    actions, _, _ = ActionEngine.evaluate_candidate_actions(
        grid=default_grid,
        peak_solar_kw=248.0,
        peak_load_kw=120.0,
        battery_config=BatteryStorageConfig(),
        installed_capacity_kw=250.0,
        eval_time="12:00",
    )
    curt_action = next((a for a in actions if a.type == "solar_curtailment"), None)
    assert curt_action is not None
    target_solar = next((s for s in default_grid.solarUnits if s.busId == "B3"), None)
    assert target_solar is not None
    assert curt_action.curtailmentKw <= target_solar.capacityKw, (
        f"Curtailment {curt_action.curtailmentKw} kW exceeds asset capacity {target_solar.capacityKw} kW"
    )
    assert curt_action.curtailmentKw <= 248.0


# ---------------------------------------------------------------------------
# Test 8: Rooftop load is not counted twice in physical solver or forecast aggregation
# ---------------------------------------------------------------------------
def test_8_no_double_counting_in_solver_or_forecast(default_grid):
    pf = PowerFlowEngine()
    buses, _, _, _ = pf.solve(default_grid, solar_kw=200.0, load_kw=120.0)
    total_allocated_load = sum(b.loadKw for b in buses)
    assert abs(total_allocated_load - 120.0) <= 0.5, (
        f"Sum of allocated bus loads {total_allocated_load} must equal aggregate load 120.0 kW exactly once"
    )

    pipeline = get_forecast_pipeline()
    pipeline.invalidate_cache("default-grid")
    fc = pipeline.generate_forecast(grid=default_grid, target_date_str="2025-06-08")
    assert fc.metrics.peakLoadKw <= 350.0, (
        f"Forecast peak load {fc.metrics.peakLoadKw} reflects single-counted nominal capacity"
    )


# ---------------------------------------------------------------------------
# Test 9: Default-grid results remain consistent with established benchmark when rooftop demand is zero
# ---------------------------------------------------------------------------
def test_9_default_grid_benchmark_consistency_when_rooftop_demand_is_zero(clean_benchmark_grid):
    pf = PowerFlowEngine()
    buses, feeders, losses, tx = pf.solve(
        grid=clean_benchmark_grid, solar_kw=248.0, load_kw=120.0, installed_solar_capacity_kw=250.0,
    )
    b3 = next(b for b in buses if b.id == "B3")
    f02 = next(f for f in feeders if f.id == "F-02")

    assert b3.voltage == 1.069, f"Expected benchmark V_B3=1.069, got {b3.voltage}"
    assert f02.loadingPercent == 107.6, f"Expected benchmark F-02=107.6%, got {f02.loadingPercent}"

    buses_bat, feeders_bat, _, _ = pf.solve(
        grid=clean_benchmark_grid, solar_kw=248.0, load_kw=120.0, battery_power_kw=-28.0, installed_solar_capacity_kw=250.0,
    )
    b3_bat = next(b for b in buses_bat if b.id == "B3")
    f02_bat = next(f for f in feeders_bat if f.id == "F-02")
    assert b3_bat.voltage <= 1.050, f"Expected resolved voltage <= 1.05, got {b3_bat.voltage}"
    assert f02_bat.loadingPercent > 100.0, f"Expected feeder overload > 100%, got {f02_bat.loadingPercent}"


# ---------------------------------------------------------------------------
# Test 10: Custom-grid results correctly account for the rooftop component
# ---------------------------------------------------------------------------
def test_10_custom_grid_accounts_for_rooftop():
    grid = create_isolated_grid()
    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(grid, solar_kw=60.0, load_kw=80.0)
    b3 = next(b for b in buses if b.id == "BUS-3")
    assert b3.solarKw > 0.0
    assert b3.loadKw > 0.0


# ---------------------------------------------------------------------------
# Test 11: Single-Snapshot Dispatch and Sequential MPC agree on physical outputs for identical states
# ---------------------------------------------------------------------------
def test_11_dispatch_and_mpc_agree_on_physical_outputs(default_grid):
    pf = PowerFlowEngine()

    # Dispatch evaluation at standard state
    b_pf, f_pf, _, tx_pf = pf.solve(
        default_grid, solar_kw=200.0, load_kw=100.0, battery_power_kw=-20.0, solar_curtailment_kw=0.0,
    )

    # Sequential MPC simulate step at same state
    mpc = SequentialController(
        grid=default_grid,
        installed_solar_capacity_kw=250.0,
    )
    init_state = mpc.initialize_state("12:00", 60.0)
    ctrl = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "title": "Battery Charging",
        "battery_power_kw": -20.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
    }
    next_state, step_action, _, _ = mpc.simulate_step(init_state, ctrl, solar_kw=200.0, load_kw=100.0)

    v_crit_pf = max(b_pf, key=lambda b: abs(b.voltage - 1.0)).voltage
    assert abs(step_action.expectedVoltagePu - v_crit_pf) <= 0.001
    f_crit_pf = max(f_pf, key=lambda f: f.loadingPercent).loadingPercent
    assert abs(step_action.expectedFeederLoadPercent - f_crit_pf) <= 0.1
    assert abs(step_action.expectedTxLoadingPercent - tx_pf) <= 0.1


# ---------------------------------------------------------------------------
# Test 12: Violation counts and reports reflect corrected physical results
# ---------------------------------------------------------------------------
def test_12_violation_counts_reflect_corrected_physics(default_grid):
    pf = PowerFlowEngine()
    limits = NetworkLimitsConfig(voltageMinPu=0.95, voltageMaxPu=1.05, feederLoadingLimitPercent=100.0)

    b_norm, f_norm, _, _ = pf.solve(default_grid, solar_kw=50.0, load_kw=120.0)
    v_norm = ConstraintChecker.check_all(b_norm, f_norm, "12:00", limits)
    assert len(v_norm) == 0, "Moderate solar with normal load produces 0 violations"

    b_crit, f_crit, _, _ = pf.solve(default_grid, solar_kw=248.0, load_kw=120.0)
    v_crit = ConstraintChecker.check_all(b_crit, f_crit, "12:00", limits)
    assert len(v_crit) >= 1, "Extreme solar reverse injection flags genuine physical violations"


# ---------------------------------------------------------------------------
# Test 13: Unsupported surrogate configurations use physical solver
# ---------------------------------------------------------------------------
def test_13_unsupported_surrogate_configurations_fallback_to_physical_solver(default_grid):
    engine = SurrogateScreeningEngine.get_instance()
    g_altered = default_grid.model_copy(deep=True)
    for s in g_altered.solarUnits:
        if s.isSolarRooftop:
            s.busId = "B4"

    is_valid, _, reason = engine.validate_candidate_topology({"is_alternative_topology": False}, g_altered)
    assert is_valid is False
    assert "surrogate" in reason.lower() or "rooftop" in reason.lower() or "physical solver required" in reason.lower()

    dummy_cands = [{"id": f"c_{i}", "battery_power_kw": 0.0, "curtailment_kw": 0.0} for i in range(10)]
    res = engine.screen_candidates(
        grid=g_altered,
        candidates_data=dummy_cands,
        base_solar_kw=150.0,
        base_load_kw=100.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=5,
    )
    assert res.routing_decision == "direct_physical_solver"
    assert res.fallback_count == 10
    for it in res.items:
        assert it.status == ScreeningStatus.FALLBACK_REQUIRED
        assert it.is_physically_verified is False


# ---------------------------------------------------------------------------
# Test 14: Changing a rooftop unit's bus connection updates electrical topology consistently
# ---------------------------------------------------------------------------
def test_14_changing_rooftop_bus_connection_updates_topology_consistently(clean_benchmark_grid):
    pf = PowerFlowEngine()
    b_b3, f_b3, _, _ = pf.solve(clean_benchmark_grid, solar_kw=248.0, load_kw=120.0)
    f02_b3 = next(f for f in f_b3 if f.id == "F-02").loadingPercent
    f04_b3 = next(f for f in f_b3 if f.id == "F-04").loadingPercent
    v_b4_b3 = next(b for b in b_b3 if b.id == "B4").voltage

    g_moved = clean_benchmark_grid.model_copy(deep=True)
    for s in g_moved.solarUnits:
        if s.isSolarRooftop:
            s.busId = "B4"

    b_b4, f_b4, _, _ = pf.solve(g_moved, solar_kw=248.0, load_kw=120.0)
    f02_b4 = next(f for f in f_b4 if f.id == "F-02").loadingPercent
    f04_b4 = next(f for f in f_b4 if f.id == "F-04").loadingPercent
    v_b4_b4 = next(b for b in b_b4 if b.id == "B4").voltage

    assert f02_b4 < f02_b3, f"F-02 loading must drop when solar is relocated to B4: {f02_b4} < {f02_b3}"
    assert v_b4_b4 > v_b4_b3, f"B4 voltage must rise with on-bus solar: {v_b4_b4} > {v_b4_b3}"
