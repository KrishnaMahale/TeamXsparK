"""
Regression Test Suite: Reconcile Single-Snapshot Dispatch and Sequential MPC Trajectory.

Verifies:
1. Same-state consistency across snapshot dispatch and MPC candidate physics.
2. Timeline alignment (chronological 15-minute sequence from 12:00).
3. 15:45 natural resolution case vs 13:15 unmitigated state (no false resolution at 13:15).
4. SOC transitions over 0.25-hour intervals with charging and discharging efficiency.
5. Battery dispatch propagation to physical power-flow solver.
6. Baseline-feasible state requires no unnecessary corrective intervention.
7. Infeasible state honestly reports remaining constraint violations.
8. Horizon regressions: 8, 24, and 96 steps.
9. All three grids: default-grid, medium-test-grid, and large-test-grid.
10. No shared-state contamination across candidate evaluation orders.
"""

import copy
import math
import pytest

from app.db.repositories.network_repository import initialize_default_grid, NetworkRepository
from app.engine.actions import ActionEngine
from app.engine.constraints import ConstraintChecker
from app.engine.power_flow import PowerFlowEngine
from app.engine.sequential_controller import SequentialController, SequentialState
from app.schemas.battery import BatteryStorageConfig
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    SequentialControlRequest,
    SequentialForecastPoint,
)
from app.schemas.simulation import NetworkLimitsConfig, SimulationInput, TimeSeriesSolarPoint, TimeSeriesLoadPoint
from app.services.sequential_control_service import SequentialControlService
from app.services.simulation_service import interpolate_power_at_time


@pytest.fixture
def default_grid():
    return initialize_default_grid()


@pytest.fixture
async def repo():
    return NetworkRepository()


# -------------------------------------------------------------------------
# 1. Same-State Consistency
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_same_state_consistency(default_grid):
    """
    Identical grid, timestamp, solar, load, SOC, topology, and action produce
    equivalent physical solver outputs in both single-snapshot and MPC candidate evaluation.
    """
    solar_kw = 240.0
    load_kw = 120.0
    soc = 62.0
    installed_cap = 250.0

    # 1. Single-Snapshot Dispatch evaluation
    b_cfg = BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=soc, maxChargeKw=40.0, maxDischargeKw=40.0)
    actions, rec_id, _ = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=solar_kw,
        peak_load_kw=load_kw,
        battery_config=b_cfg,
        installed_capacity_kw=installed_cap,
        grid=default_grid,
        eval_time="12:00",
        eval_battery_soc=soc,
    )
    reconfig_action = next(a for a in actions if a.type == "feeder_reconfiguration")

    # 2. Sequential MPC candidate physics on the exact same state
    ctrl = SequentialController(grid=default_grid, installed_solar_capacity_kw=installed_cap)
    state = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": soc},
        topology_state="standard",
    )
    ctrl_reconfig = {
        "action_type": ControllerActionType.FEEDER_RECONFIGURATION,
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
        "target_topology": "alternative",
        "title": "Switch Feeder Topology (alternative)",
    }
    _, planned_reconfig, _, viols = ctrl.simulate_step(state, ctrl_reconfig, solar_kw, load_kw)

    # Both must match authoritatively
    assert reconfig_action.isFeasible is True
    assert viols == 0
    assert planned_reconfig.violationsCount == 0
    assert abs(reconfig_action.expectedVoltagePu - planned_reconfig.expectedVoltagePu) < 0.005
    assert abs(reconfig_action.expectedFeederLoadPercent - planned_reconfig.expectedFeederLoadPercent) < 0.5


# -------------------------------------------------------------------------
# 2. Timeline Alignment
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_timeline_alignment(default_grid):
    """
    Verify exact 15-minute chronological sequence mapping for horizon starting at 12:00.
    12:00 (index 0), 12:15 (index 1), 13:15 (index 5), 15:45 (index 15), etc.
    """
    ctrl = SequentialController(grid=default_grid)
    forecast_points = [
        SequentialForecastPoint(
            time=f"{(12 * 60 + i * 15) // 60:02d}:{(12 * 60 + i * 15) % 60:02d}",
            solarKw=100.0,
            loadKw=50.0,
        )
        for i in range(24)
    ]

    window = ctrl.validate_forecast_series(forecast_points, start_time="12:00", horizon_steps=24)
    assert len(window) == 24
    assert window[0].time == "12:00"
    assert window[1].time == "12:15"
    assert window[5].time == "13:15"
    assert window[15].time == "15:45"
    assert window[23].time == "17:45"


# -------------------------------------------------------------------------
# 3. 15:45 Resolution Case vs 13:15
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_natural_resolution_at_15_45_not_13_15(default_grid):
    """
    Reproduces natural violation resolution in diurnal profile at 15:45.
    The physical power flow solver must show that the baseline grid is violating at 13:15
    and resolves naturally at 15:45 without control intervention.
    """
    pf = PowerFlowEngine(is_alternative_topology=False)
    limits = NetworkLimitsConfig()

    # Inputs at 13:15 under standard diurnal curve
    s_1315 = 244.5
    l_1315 = 136.2
    buses_1315, feeders_1315, _, tx_1315 = pf.solve(
        grid=default_grid, solar_kw=s_1315, load_kw=l_1315, battery_power_kw=0.0, installed_solar_capacity_kw=250.0
    )
    viols_1315 = ConstraintChecker.check_all(
        buses_1315, feeders_1315, "13:15", limits, transformer=default_grid.substation, tx_loading_pct=tx_1315
    )
    v_crit_1315 = max(b.voltage for b in buses_1315)
    f_crit_1315 = max(f.loadingPercent for f in feeders_1315)

    # Must be violating at 13:15 without corrective action
    assert len(viols_1315) > 0, "13:15 baseline must have violations"
    assert v_crit_1315 > 1.05
    assert f_crit_1315 > 100.0

    # Inputs at 15:45 under standard diurnal curve
    s_1545 = 176.0
    l_1545 = 151.8
    buses_1545, feeders_1545, _, tx_1545 = pf.solve(
        grid=default_grid, solar_kw=s_1545, load_kw=l_1545, battery_power_kw=0.0, installed_solar_capacity_kw=250.0
    )
    viols_1545 = ConstraintChecker.check_all(
        buses_1545, feeders_1545, "15:45", limits, transformer=default_grid.substation, tx_loading_pct=tx_1545
    )
    v_crit_1545 = max(b.voltage for b in buses_1545)
    f_crit_1545 = max(f.loadingPercent for f in feeders_1545)

    # Must resolve naturally at 15:45
    assert len(viols_1545) == 0, "15:45 baseline must naturally resolve"
    assert v_crit_1545 <= 1.05
    assert f_crit_1545 <= 100.0


# -------------------------------------------------------------------------
# 4. SOC Transitions (0.25-hour Steps)
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_soc_transitions(default_grid):
    """
    Verify battery charging and discharging SOC updates over 0.25h (15 minutes).
    Capacity: 100 kWh, dt: 0.25h, efficiency: 0.92.
    """
    ctrl = SequentialController(grid=default_grid, step_duration_hours=0.25)
    state = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": 62.0},
        topology_state="standard",
    )

    # Test charging: -40 kW
    ctrl_charge = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "battery_power_kw": -40.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "BESS Absorption (-40 kW)",
    }
    next_state_chg, action_chg, _, _ = ctrl.simulate_step(state, ctrl_charge, solar_kw=100.0, load_kw=50.0)
    expected_energy_in = 40.0 * 0.25 * 0.92  # 9.2 kWh
    expected_soc_chg = 62.0 + (expected_energy_in / 100.0) * 100.0  # 71.2%
    assert abs(next_state_chg.battery_socs["BAT-01"] - expected_soc_chg) < 0.1
    assert abs(action_chg.batterySocAfter - expected_soc_chg) < 0.1

    # Test discharging: +40 kW
    ctrl_dischg = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "battery_power_kw": +40.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "BESS Peak Shaving (+40 kW)",
    }
    next_state_dis, action_dis, _, _ = ctrl.simulate_step(state, ctrl_dischg, solar_kw=100.0, load_kw=50.0)
    expected_energy_out = (40.0 * 0.25) / 0.92  # 10.87 kWh
    expected_soc_dis = 62.0 - (expected_energy_out / 100.0) * 100.0  # 51.13%
    assert abs(next_state_dis.battery_socs["BAT-01"] - expected_soc_dis) < 0.1
    assert abs(action_dis.batterySocAfter - expected_soc_dis) < 0.1


# -------------------------------------------------------------------------
# 5. Battery Dispatch Propagation
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_battery_dispatch_propagation(default_grid):
    """
    Confirms that battery dispatch reaches the physical power flow solver
    and alters critical voltage and loading.
    """
    ctrl = SequentialController(grid=default_grid, installed_solar_capacity_kw=250.0)
    state = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": 62.0},
        topology_state="standard",
    )

    ctrl_idle = {
        "action_type": ControllerActionType.IDLE,
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "Idle",
    }
    ctrl_chg = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "battery_power_kw": -40.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "BESS Charge",
    }

    _, act_idle, _, _ = ctrl.simulate_step(state, ctrl_idle, solar_kw=240.0, load_kw=120.0)
    _, act_chg, _, _ = ctrl.simulate_step(state, ctrl_chg, solar_kw=240.0, load_kw=120.0)

    # Battery absorption must physically suppress voltage at Bus 3
    assert act_chg.expectedVoltagePu < act_idle.expectedVoltagePu
    assert act_chg.batteryPowerKw == -40.0


# -------------------------------------------------------------------------
# 6. Baseline-Feasible State (No Unnecessary Actions)
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_baseline_feasible_state_no_unnecessary_actions(default_grid):
    """
    When the baseline state is feasible, idle dispatch is valid and reports 0 violations.
    """
    ctrl = SequentialController(grid=default_grid, installed_solar_capacity_kw=250.0)
    state = SequentialState(
        step_index=0,
        time="10:00",
        battery_socs={"BAT-01": 62.0},
        topology_state="standard",
    )
    ctrl_idle = {
        "action_type": ControllerActionType.IDLE,
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "Float / Idle",
    }
    # Solar=100 kW, Load=120 kW is well within safe thresholds
    _, act, _, viols = ctrl.simulate_step(state, ctrl_idle, solar_kw=100.0, load_kw=120.0)
    assert viols == 0
    assert act.violationsCount == 0
    assert act.expectedVoltagePu <= 1.05
    assert act.expectedFeederLoadPercent <= 100.0


# -------------------------------------------------------------------------
# 7. Infeasible State Honestly Reported
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_infeasible_state_reported_honestly(default_grid):
    """
    The sequential controller never labels a violating physical state as feasible.
    """
    ctrl = SequentialController(grid=default_grid, installed_solar_capacity_kw=250.0)
    # Solar=350 kW, Load=50 kW on standard topology without control
    state = SequentialState(
        step_index=0,
        time="13:00",
        battery_socs={"BAT-01": 95.0},  # Battery cannot absorb
        topology_state="standard",
    )
    ctrl_idle = {
        "action_type": ControllerActionType.IDLE,
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "Float / Idle",
    }
    _, act, _, viols = ctrl.simulate_step(state, ctrl_idle, solar_kw=350.0, load_kw=50.0)
    assert viols > 0
    assert act.violationsCount > 0
    assert act.expectedVoltagePu > 1.05


# -------------------------------------------------------------------------
# 8. Horizon Regressions: 8, 24, and 96 Steps
# -------------------------------------------------------------------------
@pytest.mark.asyncio
@pytest.mark.parametrize("horizon", [8, 24, 96])
async def test_horizon_regression(default_grid, horizon):
    """
    Verifies that MPC plans cleanly for 8, 24, and 96 steps with accurate step lengths and times.
    """
    seq_service = SequentialControlService()
    req = SequentialControlRequest(
        gridId="default-grid",
        startTimestep="06:00" if horizon == 96 else "12:00",
        horizonSteps=horizon,
        stepDurationHours=0.25,
        forecastData=[
            SequentialForecastPoint(
                time=f"{(((6 if horizon == 96 else 12) * 60 + i * 15) // 60) % 24:02d}:{((6 if horizon == 96 else 12) * 60 + i * 15) % 60:02d}",
                solarKw=100.0,
                loadKw=80.0,
            )
            for i in range(horizon)
        ],
    )
    res = await seq_service.plan_sequential_control(req)
    assert res.horizonSteps == horizon
    assert len(res.plannedTrajectory) == horizon
    assert res.durationHours == pytest.approx(horizon * 0.25, rel=1e-3)
    assert all(step.isPhysicallyVerified for step in res.plannedTrajectory)


# -------------------------------------------------------------------------
# 9. All Three Grids
# -------------------------------------------------------------------------
@pytest.mark.asyncio
@pytest.mark.parametrize("grid_id", ["default-grid", "medium-test-grid", "large-test-grid"])
async def test_all_three_grids(repo, grid_id):
    """
    Tests sequential planning across all three grids ensuring physical verification.
    """
    grid = await repo.get_grid(grid_id)
    assert grid is not None
    seq_service = SequentialControlService(network_repo=repo)
    req = SequentialControlRequest(
        gridId=grid_id,
        startTimestep="12:00",
        horizonSteps=8,
        stepDurationHours=0.25,
        forecastData=[
            SequentialForecastPoint(
                time=f"{(12 * 60 + i * 15) // 60:02d}:{(12 * 60 + i * 15) % 60:02d}",
                solarKw=80.0,
                loadKw=60.0,
            )
            for i in range(8)
        ],
    )
    res = await seq_service.plan_sequential_control(req)
    assert res.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    assert len(res.plannedTrajectory) == 8
    assert res.physicalSolveCount > 0


# -------------------------------------------------------------------------
# 10. No Shared-State Contamination
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_no_shared_state_contamination(default_grid):
    """
    Evaluating candidates in different orders must not change their physical outputs.
    Guarantees isolation of transformer and bus voltage state.
    """
    ctrl = SequentialController(grid=default_grid, installed_solar_capacity_kw=250.0)
    state = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": 62.0},
        topology_state="standard",
    )
    candidates = ctrl.generate_candidate_controls(state, solar_kw=240.0, load_kw=120.0)

    # Order 1: Forward
    results_fwd = [ctrl.simulate_step(state, c, solar_kw=240.0, load_kw=120.0)[1] for c in candidates]

    # Order 2: Reverse
    results_rev = [ctrl.simulate_step(state, c, solar_kw=240.0, load_kw=120.0)[1] for c in reversed(candidates)]
    results_rev.reverse()

    for act_fwd, act_rev in zip(results_fwd, results_rev):
        assert act_fwd.expectedVoltagePu == act_rev.expectedVoltagePu
        assert act_fwd.expectedFeederLoadPercent == act_rev.expectedFeederLoadPercent
        assert act_fwd.violationsCount == act_rev.violationsCount
        assert act_fwd.expectedTxLoadingPercent == act_rev.expectedTxLoadingPercent
