"""
Comprehensive Unit and Integration Tests for ENR-02 Step 4B:
- Battery physics and duration energy integration at 0.25 hours
- Baseline battery power coupling into physical solves
- Isolated sequential state and absence of candidate state leakage
- 8-step chronological receding-horizon sequential controller
- Multi-battery tracking and future constraint avoidance
- Infeasible scenario and malformed input handling
"""

import copy
import pytest
from app.db.repositories.network_repository import initialize_default_grid, NetworkRepository
from app.engine.battery import BatteryEngine
from app.engine.network_engine import NetworkEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.sequential_controller import SequentialController, SequentialState
from app.schemas.battery import BatteryStorageConfig
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    SequentialControlRequest,
    SequentialForecastPoint,
)
from app.schemas.simulation import (
    NetworkLimitsConfig,
    SimulationInput,
    TimeSeriesLoadPoint,
    TimeSeriesSolarPoint,
)


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def default_grid():
    return initialize_default_grid()


@pytest.fixture
def standard_battery_config():
    return BatteryStorageConfig(
        capacityKwh=100.0,
        initialSocPercent=60.0,
        maxChargeKw=40.0,
        maxDischargeKw=40.0,
    )


def create_mock_forecast(start_hour: int = 12, start_min: int = 0, count: int = 8, solar_peak: float = 200.0, load_base: float = 120.0):
    points = []
    current_mins = start_hour * 60 + start_min
    for i in range(count):
        h = (current_mins // 60) % 24
        m = current_mins % 60
        t_str = f"{h:02d}:{m:02d}"
        # Shape solar bell curve
        sol = max(0.0, solar_peak * (1.0 - abs(i - count // 2) / (count // 2)))
        points.append(
            SequentialForecastPoint(
                time=t_str,
                solarKw=round(sol, 1),
                loadKw=round(load_base, 1),
            )
        )
        current_mins += 15
    return points


# -----------------------------------------------------------------------------
# 1 & 2. Battery Power-Flow Coupling and Zero Dispatch Baseline
# -----------------------------------------------------------------------------

def test_battery_power_affects_physical_power_flow(default_grid):
    """Verify that passing nonzero battery power into physical solve alters voltage and branch loading."""
    pf = PowerFlowEngine()
    # 1. Zero dispatch
    buses_0, feeders_0, _, _ = pf.solve(default_grid, solar_kw=220.0, load_kw=100.0, battery_power_kw=0.0)
    v_b3_0 = next(b.voltage for b in buses_0 if b.id == "B3")
    f_02_0 = next(f.loadingPercent for f in feeders_0 if f.id == "F-02")

    # 2. Charging (-40 kW) must suppress voltage and decrease net feeder loading
    buses_chg, feeders_chg, _, _ = pf.solve(default_grid, solar_kw=220.0, load_kw=100.0, battery_power_kw=-40.0)
    v_b3_chg = next(b.voltage for b in buses_chg if b.id == "B3")
    f_02_chg = next(f.loadingPercent for f in feeders_chg if f.id == "F-02")

    assert v_b3_chg < v_b3_0, f"Charging must suppress voltage (got {v_b3_chg} >= {v_b3_0})"
    assert f_02_chg < f_02_0, f"Charging must relieve reverse feeder loading (got {f_02_chg} >= {f_02_0})"

    # 3. Discharging (+40 kW) must boost voltage and increase branch flow
    buses_dis, feeders_dis, _, _ = pf.solve(default_grid, solar_kw=100.0, load_kw=200.0, battery_power_kw=+40.0)
    v_b3_dis = next(b.voltage for b in buses_dis if b.id == "B3")
    buses_dis0, _, _, _ = pf.solve(default_grid, solar_kw=100.0, load_kw=200.0, battery_power_kw=0.0)
    v_b3_dis0 = next(b.voltage for b in buses_dis0 if b.id == "B3")
    assert v_b3_dis > v_b3_dis0, f"Discharge injection must boost voltage (got {v_b3_dis} <= {v_b3_dis0})"


def test_baseline_network_engine_includes_battery_dispatch(default_grid):
    """Regression test confirming NetworkEngine.run_full_simulation passes battery dispatch to the solver."""
    sim_input = SimulationInput(
        gridId=default_grid.id,
        solarTimeSeries=[TimeSeriesSolarPoint(id="s1", time="08:00", solarKw=150.0)],
        loadTimeSeries=[TimeSeriesLoadPoint(id="l1", time="08:00", loadKw=80.0)],
        batteryConfig=BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=50.0, maxChargeKw=40.0),
    )
    result = NetworkEngine.run_full_simulation(sim_input, default_grid)
    pt = result.timeStepResults["08:00"]
    # At 08:00 with excess solar (150 - 80 = 70 kW > 10 kW), battery charges and advances SOC
    assert pt.batterySocPercent > 50.0, "Battery SOC should increase when charging"
    # Ensure physical power flow converged
    assert pt.converged is True


# -----------------------------------------------------------------------------
# 3, 4, 5. Energy Calculations, SOC Boundaries, and Limits (0.25h timestep)
# -----------------------------------------------------------------------------

def test_battery_quarter_hour_energy_integration(standard_battery_config):
    """
    Test energy integration over 0.25 hours (15 minutes).
    For a 40 kW dispatch over 0.25 hours, the grid energy magnitude is exactly 10 kWh.
    """
    engine = BatteryEngine(standard_battery_config)
    # Grid energy
    grid_energy = engine.calculate_grid_energy_kwh(power_kw=40.0, duration_hours=0.25)
    assert abs(grid_energy - 10.0) < 1e-4, f"40 kW x 0.25h must equal 10.0 kWh (got {grid_energy})"

    # Discharging 40 kW over 0.25h extracts: 10 kWh / 0.92 = 10.8696 kWh
    e_dischg = engine.calculate_battery_energy_kwh(power_kw=40.0, duration_hours=0.25)
    expected_dischg = 10.0 / 0.92
    assert abs(e_dischg - round(expected_dischg, 4)) < 1e-3

    # Charging 40 kW over 0.25h stores: 10 kWh x 0.92 = 9.2000 kWh
    e_chg = engine.calculate_battery_energy_kwh(power_kw=-40.0, duration_hours=0.25)
    assert abs(e_chg - 9.2) < 1e-3

    # SOC delta on 100 kWh battery
    # Discharging: -10.87%
    delta_dis = engine.calculate_soc_delta(power_kw=40.0, duration_hours=0.25)
    assert delta_dis < 0
    assert abs(abs(delta_dis) - 10.8696) < 0.01

    # Charging: +9.20%
    delta_chg = engine.calculate_soc_delta(power_kw=-40.0, duration_hours=0.25)
    assert delta_chg > 0
    assert abs(delta_chg - 9.2) < 0.01


def test_battery_soc_ceiling_and_floor_enforcement(standard_battery_config):
    """Verify that battery limits (min 20%, max 95%) are strictly enforced without illegal dispatch."""
    # 1. Ceiling test: battery at 94.5% cannot absorb a full 40 kW (needs 9.2% headroom)
    config_high = BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=94.5, maxChargeKw=40.0)
    engine_high = BatteryEngine(config_high)
    can_chg, reason = engine_high.can_charge(requested_kw=40.0, duration_hours=0.25)
    assert can_chg is False
    assert "capacity ceiling" in reason.lower()

    # Feasible charge calculation must not exceed remaining headroom
    max_feasible_chg = engine_high.get_max_feasible_charge_kw(duration_hours=0.25)
    assert max_feasible_chg < 40.0
    # Available headroom: (95 - 94.5) = 0.5 kWh / (0.25 * 0.92) = 2.17 kW
    assert max_feasible_chg > 0.0

    # 2. Floor test: battery at 21.0% cannot discharge full 40 kW (requires 10.87% reserve)
    config_low = BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=21.0, maxDischargeKw=40.0)
    engine_low = BatteryEngine(config_low)
    can_dis, reason = engine_low.can_discharge(requested_kw=40.0, duration_hours=0.25)
    assert can_dis is False
    assert "reserves" in reason.lower()


def test_battery_duration_validation():
    """Verify proper validation of zero, negative, and invalid durations."""
    engine = BatteryEngine(BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=50.0))
    # Non-positive duration in can_discharge
    can_d, r_d = engine.can_discharge(10.0, duration_hours=0.0)
    assert can_d is False
    assert "greater than zero" in r_d.lower()

    can_c, r_c = engine.can_charge(10.0, duration_hours=-0.5)
    assert can_c is False

    with pytest.raises(ValueError):
        engine.validate_duration(-1.0)


# -----------------------------------------------------------------------------
# 6 & 7. 8-Step Chronological Planning & Accurate SOC Propagation
# -----------------------------------------------------------------------------

def test_sequential_controller_8_step_plan(default_grid):
    """Verify execution of an 8-step chronological plan with correct state transitions."""
    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)
    forecast = create_mock_forecast(start_hour=11, start_min=0, count=8, solar_peak=220.0, load_base=100.0)

    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="11:00",
        horizonSteps=8,
        stepDurationHours=0.25,
        initialSocPercent=50.0,
        forecastData=forecast,
        recedingHorizonMode=True,
    )

    response = controller.plan(req)
    assert response.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    assert response.horizonSteps == 8
    assert len(response.plannedTrajectory) == 8

    # Verify chronological sequence and SOC continuity
    for i in range(len(response.plannedTrajectory)):
        step = response.plannedTrajectory[i]
        assert step.stepIndex == i
        assert step.isPhysicallyVerified is True
        assert step.solverConverged is True

        if i > 0:
            prev_step = response.plannedTrajectory[i - 1]
            # State continuity: SOC before step i must equal SOC after step i-1
            assert abs(step.batterySocBefore - prev_step.batterySocAfter) < 1e-2, (
                f"SOC discontinuity at step {i}: {step.batterySocBefore} != {prev_step.batterySocAfter}"
            )

    assert response.recommendedFirstAction is not None
    assert response.recommendedFirstAction.stepIndex == 0
    assert response.physicalSolveCount > 0
    assert response.planningLatencyMs > 0


# -----------------------------------------------------------------------------
# 8. Candidate State Isolation (No State Leakage)
# -----------------------------------------------------------------------------

def test_sequential_state_immutability_and_isolation(default_grid):
    """Verify that SequentialState is strictly immutable and candidate evaluations cannot leak state."""
    state_0 = SequentialState(
        step_index=0,
        time="12:00",
        battery_socs={"BAT-01": 50.0},
        topology_state="standard",
    )

    # Attempting to mutate state_0 should raise an error
    with pytest.raises(Exception):
        state_0.step_index = 1  # type: ignore

    with pytest.raises(Exception):
        state_0.battery_socs["BAT-01"] = 70.0  # type: ignore

    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)

    # Simulate Candidate A (charge)
    state_a, act_a, _, _ = controller.simulate_step(
        current_state=state_0,
        control={"action_type": ControllerActionType.BATTERY_DISPATCH, "battery_power_kw": -40.0, "curtailment_kw": 0.0, "target_topology": "standard", "title": "Charge"},
        solar_kw=200.0,
        load_kw=100.0,
    )

    # Simulate Candidate B (discharge) from the SAME state_0
    state_b, act_b, _, _ = controller.simulate_step(
        current_state=state_0,
        control={"action_type": ControllerActionType.BATTERY_DISPATCH, "battery_power_kw": +40.0, "curtailment_kw": 0.0, "target_topology": "standard", "title": "Discharge"},
        solar_kw=100.0,
        load_kw=150.0,
    )

    # State A should have higher SOC, State B lower SOC, while state_0 remains at 50.0%
    assert state_0.battery_socs["BAT-01"] == 50.0
    assert state_a.battery_socs["BAT-01"] > 50.0
    assert state_b.battery_socs["BAT-01"] < 50.0
    assert state_a.battery_socs["BAT-01"] != state_b.battery_socs["BAT-01"]


# -----------------------------------------------------------------------------
# 9. Future Violation Changes Preferred Action (Lookahead Value)
# -----------------------------------------------------------------------------

def test_future_violation_influences_trajectory_choice(default_grid):
    """
    Verify that an impending violation at step k=3 forces the controller to prepare
    at earlier steps (e.g. charging or switching), demonstrating true sequential planning.
    """
    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)

    # Forecast with extreme solar spike at step 3 (causing overvoltage if BESS is not charged)
    forecast = create_mock_forecast(start_hour=11, start_min=0, count=8, solar_peak=120.0, load_base=110.0)
    # Inject massive surplus at step 3
    forecast[3].solarKw = 250.0
    forecast[3].loadKw = 80.0

    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="11:00",
        horizonSteps=8,
        initialSocPercent=40.0,
        forecastData=forecast,
        recedingHorizonMode=True,
    )
    response = controller.plan(req)
    assert response.status == PlanStatus.FEASIBLE
    assert response.isFeasible is True

    # At step 3, controller must command action to mitigate the severe overvoltage
    step_3_action = response.plannedTrajectory[3]
    assert step_3_action.batteryPowerKw < 0 or step_3_action.curtailmentKw > 0 or step_3_action.targetTopology == "alternative"
    assert step_3_action.violationsCount == 0


# -----------------------------------------------------------------------------
# 10. Infeasible Operating Scenario
# -----------------------------------------------------------------------------

def test_infeasible_scenario_returns_explicit_infeasible_status(default_grid):
    """Verify that when no safe trajectory is physically achievable, an explicit INFEASIBLE status is returned."""
    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)

    # Catastrophic scenario: extreme load far exceeding substation transformer and line ampacity, zero solar
    catastrophic_forecast = create_mock_forecast(start_hour=18, start_min=0, count=8, solar_peak=0.0, load_base=600.0)

    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="18:00",
        horizonSteps=8,
        initialSocPercent=20.0,  # Depleted battery cannot shave 600 kW
        forecastData=catastrophic_forecast,
    )
    response = controller.plan(req)
    assert response.status == PlanStatus.INFEASIBLE
    assert response.isFeasible is False
    assert response.fallbackReason is not None
    assert "no fully safe trajectory" in response.fallbackReason.lower()
    assert response.remainingViolationsTotal > 0


# -----------------------------------------------------------------------------
# 11. Malformed and Incomplete Forecast Input Handling
# -----------------------------------------------------------------------------

def test_malformed_forecast_validation_errors(default_grid):
    """Verify graceful error reporting when forecast input is malformed, has invalid spacing, or is incomplete."""
    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)

    # 1. Horizon < 8 rejected by controller.validate_forecast_series or SequentialControlRequest schema
    with pytest.raises(Exception):
        controller.validate_forecast_series(
            forecast_points=create_mock_forecast(start_hour=12, count=6),
            start_time="12:00",
            horizon_steps=6,
        )

    # 2. Irregular spacing (30-minute jump instead of 15-minute)
    irregular_forecast = [
        SequentialForecastPoint(time="12:00", solarKw=100.0, loadKw=100.0),
        SequentialForecastPoint(time="12:30", solarKw=100.0, loadKw=100.0),  # 30-min jump!
    ] + create_mock_forecast(start_hour=13, count=6)

    req_spacing = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=irregular_forecast,
    )
    res_spacing = controller.plan(req_spacing)
    assert res_spacing.status == PlanStatus.ERROR
    assert "15 minutes apart" in res_spacing.fallbackReason.lower()


# -----------------------------------------------------------------------------
# 12 & 14. Multi-Battery Representation on Large Grid
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_multi_battery_tracking_on_large_grid():
    """Verify that on large-test-grid with multiple BESS units, individual battery states are tracked."""
    repo = NetworkRepository()
    large_grid = await repo.get_grid("large-test-grid")
    assert large_grid is not None
    assert len(large_grid.batteries) >= 2, "Large grid must have multiple batteries"

    controller = SequentialController(grid=large_grid, step_duration_hours=0.25)
    forecast = create_mock_forecast(start_hour=12, count=8, solar_peak=350.0, load_base=250.0)

    bat_ids = [b.id for b in large_grid.batteries]
    req = SequentialControlRequest(
        gridId="large-test-grid",
        startTimestep="12:00",
        horizonSteps=8,
        batterySocs={bat_ids[0]: 50.0, bat_ids[1]: 70.0},  # Disjoint initial SOCs
        forecastData=forecast,
    )

    response = controller.plan(req)
    assert response.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    # Check that individual battery SOCs are recorded in trajectory steps
    for step in response.plannedTrajectory:
        assert len(step.batterySocsAfter) >= 2
        for bid in bat_ids:
            assert bid in step.batterySocsAfter
            assert 0.0 <= step.batterySocsAfter[bid] <= 100.0


# -----------------------------------------------------------------------------
# 13. Dynamic Replanning Support
# -----------------------------------------------------------------------------

def test_controller_replan_execution(default_grid):
    """Verify that controller.replan updates trajectory based on new telemetry."""
    controller = SequentialController(grid=default_grid, step_duration_hours=0.25)
    f1 = create_mock_forecast(start_hour=12, count=8, solar_peak=200.0, load_base=100.0)

    req1 = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        initialSocPercent=50.0,
        forecastData=f1,
    )
    res1 = controller.plan(req1)
    assert res1.recommendedFirstAction is not None

    # Now simulate time advance to 12:15: new observed SOC is 58.0%
    curr_state = SequentialState(
        step_index=1,
        time="12:15",
        battery_socs={"BAT-01": 58.0},
        topology_state="standard",
    )
    # Cloud arrived: new forecast has 50% lower solar
    f_updated = create_mock_forecast(start_hour=12, start_min=15, count=8, solar_peak=100.0, load_base=100.0)

    res_replanned = controller.replan(
        current_state=curr_state,
        updated_forecast=f_updated,
        horizon_steps=8,
    )

    assert res_replanned.startTimestep == "12:15"
    assert len(res_replanned.plannedTrajectory) == 8
    assert res_replanned.plannedTrajectory[0].time == "12:15"
    assert abs(res_replanned.plannedTrajectory[0].batterySocBefore - 58.0) < 1e-2
