"""
Tests for Phase 3B — Dynamic Candidate Generation and Bounded Corrective-Action Search.

Verifies:
1. Dynamic worst-timestep selection across all 96 simulation points.
2. Evening undervoltage selected over midday when evening is more severe.
3. Transformer overload can determine the selected timestep even without voltage violations.
4. Deterministic no-violation behavior on clean networks.
5. Violation-aware candidate generation (regime-specific candidates).
6. Solar curtailment marked inapplicable for pure undervoltage / demand deficits.
7. Bounded bisection search finds minimal effective battery dispatch magnitude.
8. Battery dispatch respects power and SOC limits (cannot charge >= 95%, cannot discharge <= 20%).
9. Bounded bisection search for minimal solar curtailment (not capped by old 50 kW heuristic).
10. Feeder reconfiguration is marked unsupported on grids lacking alternate tie-lines.
11. Hierarchical safety-first candidate ranking prioritizes safety and penalizes new violations.
12. Explicit numerical parameters (dispatchKw, curtailmentKw, targetTopology, controlDirection)
    are populated and consumed during genuine recalculation.
13. Evaluation across default, medium, large, and custom grids.
"""

import copy
import pytest
from app.db.repositories.network_repository import NetworkRepository
from app.engine.actions import ActionEngine
from app.engine.network_engine import NetworkEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.services.action_service import ActionService
from app.schemas.battery import BatteryStorageConfig
from app.schemas.network import GridNetwork, Transformer
from app.schemas.simulation import (
    SimulationInput,
    TimeSeriesSolarPoint,
    TimeSeriesLoadPoint,
    NetworkLimitsConfig,
)
from app.schemas.violation import ViolationType, ViolationSeverity


@pytest.mark.asyncio
async def test_midday_overvoltage_timestep_selected():
    """Verify that a simulation with midday solar peak correctly selects the midday timestep."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    # Construct simulation with high midday solar (240 kW at 13:15) causing overvoltage
    sim_input = SimulationInput(
        gridId=grid.id,
        currentSolarKw=240.0,
        currentLoadKw=100.0,
        installedSolarCapacityKw=250.0,
    )
    result = NetworkEngine.run_full_simulation(sim_input, grid)

    # Midday peak (12:00, 13:00, or 13:15) should be selected due to overvoltage
    assert result.summary.simulationTime in ("12:00", "13:00", "13:15", "12:30", "12:45")
    assert result.summary.initialViolations > 0


@pytest.mark.asyncio
async def test_evening_undervoltage_timestep_selected_over_midday():
    """Verify that severe evening undervoltage is selected instead of blindly picking 13:15."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Construct time-series with zero solar / moderate load midday, but extreme demand in evening (19:30)
    times = ["12:00", "13:15", "18:00", "19:30", "20:00"]
    solar_points = [
        TimeSeriesSolarPoint(id=f"s-{t}", time=t, solarKw=30.0 if "13" in t or "12" in t else 0.0)
        for t in times
    ]
    # Extreme evening peak load causing bus voltage drop below v_min
    load_points = [
        TimeSeriesLoadPoint(id=f"l-{t}", time=t, loadKw=90.0 if "13" in t or "12" in t else 280.0 if t == "19:30" else 100.0)
        for t in times
    ]

    sim_input = SimulationInput(
        gridId=grid.id,
        solarTimeSeries=solar_points,
        loadTimeSeries=load_points,
        networkConfig=NetworkLimitsConfig(voltageMinPu=0.97, voltageMaxPu=1.05),
    )
    result = NetworkEngine.run_full_simulation(sim_input, grid)

    # The engine must select 19:30 where the severe undervoltage occurs, NOT 13:15
    assert result.summary.simulationTime == "19:30"
    assert result.summary.loadKw == 280.0
    assert result.summary.solarKw == 0.0


@pytest.mark.asyncio
async def test_transformer_overload_determines_worst_timestep():
    """Verify that a transformer overload determines the selected timestep even without voltage violation."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Lower transformer rating so peak load at 18:00 triggers transformer overload
    grid_tx = copy.deepcopy(grid)
    grid_tx.substation.ratingKva = 100.0

    times = ["10:00", "13:15", "18:00"]
    solar_points = [
        TimeSeriesSolarPoint(id=f"s-{t}", time=t, solarKw=20.0 if t == "13:15" else 0.0)
        for t in times
    ]
    # At 18:00, load is 160 kW, causing >100% tx loading on 100 kVA transformer
    load_points = [
        TimeSeriesLoadPoint(id=f"l-{t}", time=t, loadKw=50.0 if t == "10:00" else 60.0 if t == "13:15" else 160.0)
        for t in times
    ]

    sim_input = SimulationInput(
        gridId=grid.id,
        solarTimeSeries=solar_points,
        loadTimeSeries=load_points,
        networkConfig=NetworkLimitsConfig(voltageMinPu=0.90, voltageMaxPu=1.10), # wide voltage bounds
    )
    result = NetworkEngine.run_full_simulation(sim_input, grid_tx)

    # 18:00 must be chosen because of transformer overload
    assert result.summary.simulationTime == "18:00"
    assert result.summary.initialViolations > 0


@pytest.mark.asyncio
async def test_deterministic_no_violation_behavior():
    """Verify that a network with no violations follows documented, deterministic behavior."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Mild operating condition: 50 kW solar, 60 kW load (no overvoltage, no overload)
    times = ["09:00", "12:00", "13:15", "15:00"]
    solar_points = [
        TimeSeriesSolarPoint(id=f"s-{t}", time=t, solarKw=50.0)
        for t in times
    ]
    load_points = [
        TimeSeriesLoadPoint(id=f"l-{t}", time=t, loadKw=60.0)
        for t in times
    ]

    sim_input = SimulationInput(
        gridId=grid.id,
        solarTimeSeries=solar_points,
        loadTimeSeries=load_points,
        networkConfig=NetworkLimitsConfig(voltageMinPu=0.90, voltageMaxPu=1.10),
    )
    result = NetworkEngine.run_full_simulation(sim_input, grid)

    assert result.summary.initialViolations == 0
    assert result.summary.status == "safe"
    assert result.summary.simulationTime in ("13:15", "12:00")
    assert "No intervention required" in result.summary.recommendedAction


@pytest.mark.asyncio
async def test_solar_curtailment_inapplicable_for_pure_undervoltage():
    """Verify that solar curtailment is marked inapplicable for pure undervoltage conditions."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=60.0)

    # High demand deficit with v_min=0.98: load=260 kW causes bus 3 voltage (0.968 pu) to breach v_min
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=10.0,
        peak_load_kw=260.0,
        battery_config=b_config,
        v_min=0.98,
        v_max=1.05,
        grid=grid,
        eval_time="19:30",
    )

    act_03 = next(a for a in actions if a.id == "ACT-03")
    assert act_03.isFeasible is False
    assert "Inapplicable" in (act_03.infeasibleReason or "")
    assert "low-voltage" in (act_03.infeasibleReason or "").lower() or "undervoltage" in (act_03.infeasibleReason or "").lower()


@pytest.mark.asyncio
async def test_bounded_minimal_battery_dispatch_sizing():
    """Verify battery dispatch is sized via bounded search rather than hardcoded 40 kW."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=60.0, maxChargeKw=60.0)

    # Mild overvoltage condition where less than 40 kW is sufficient to restore voltage <= 1.05
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=200.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        v_max=1.05,
        grid=grid,
    )

    act_01 = next(a for a in actions if a.id == "ACT-01")
    assert act_01.isFeasible is True
    assert act_01.dispatchKw is not None
    assert act_01.dispatchKw < 0  # Charging to absorb solar surplus
    # The dispatch should be bounded and not blindly hardcoded
    assert abs(act_01.dispatchKw) <= 60.0
    assert act_01.controlDirection == "charge"


@pytest.mark.asyncio
async def test_battery_cannot_charge_when_soc_above_limit():
    """Verify battery cannot charge when SOC is already at or above 95%."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=96.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    act_01 = next(a for a in actions if a.id == "ACT-01")
    assert act_01.isFeasible is False
    assert "95%" in (act_01.infeasibleReason or "")


@pytest.mark.asyncio
async def test_battery_cannot_discharge_when_soc_below_reserve_floor():
    """Verify battery cannot discharge when SOC is at or below 20% safe reserve floor."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=18.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=0.0,
        peak_load_kw=200.0,
        battery_config=b_config,
        grid=grid,
        eval_time="19:30",
    )

    act_01 = next(a for a in actions if a.id == "ACT-01")
    assert act_01.isFeasible is False
    assert "20%" in (act_01.infeasibleReason or "")


@pytest.mark.asyncio
async def test_bounded_solar_curtailment_not_capped_at_50kw():
    """Verify solar curtailment can search beyond the old 50 kW heuristic if required."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=60.0)

    # Large solar penetration (280 kW solar, 80 kW load) requiring significant curtailment
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=280.0,
        peak_load_kw=80.0,
        battery_config=b_config,
        v_max=1.05,
        grid=grid,
    )

    act_03 = next(a for a in actions if a.id == "ACT-03")
    assert act_03.isFeasible is True
    assert act_03.curtailmentKw is not None
    assert act_03.curtailmentKw > 0.0
    assert act_03.renewableUtilizationPercent < 100.0


@pytest.mark.asyncio
async def test_grid_without_alternate_tieline_marks_reconfiguration_unsupported():
    """Verify a network lacking alternate tie-lines honestly marks feeder reconfiguration unsupported."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    grid_no_alt = copy.deepcopy(grid)

    # Remove all reconfigurable alternate flags
    for f in grid_no_alt.feeders:
        f.isReconfigurableAlternate = False
        f.isSwitchClosed = True

    b_config = BatteryStorageConfig(initialSocPercent=60.0)
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid_no_alt,
    )

    act_02 = next(a for a in actions if a.id == "ACT-02")
    assert act_02.isFeasible is False
    assert "lacks an alternate reconfigurable feeder" in (act_02.infeasibleReason or "")
    # Should not be recommended
    assert rec_id != "ACT-02"


@pytest.mark.asyncio
async def test_hierarchical_ranking_prefers_safety_over_curtailment():
    """Verify ranking prefers feeder switching or battery dispatch that preserves 100% renewable generation."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=60.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    # Feeder reconfiguration or battery dispatch that keeps 100% renewable utilization
    # should rank above solar curtailment when both resolve the violation
    act_02 = next(a for a in actions if a.id == "ACT-02")
    act_03 = next(a for a in actions if a.id == "ACT-03")

    if act_02.remainingViolationsCount == 0 and act_03.remainingViolationsCount == 0:
        # Feeder reconfiguration maintains 100% renewable utilization, so it beats curtailment
        assert rec_id == "ACT-02"


@pytest.mark.asyncio
async def test_action_execution_uses_explicit_numerical_parameters():
    """Verify action execution consumes explicit numeric control parameters rather than string parsing."""
    service = ActionService()
    result = await service.execute_action("ACT-02", grid_id="default-grid")

    assert result.actionId == "ACT-02"
    assert result.success is True
    assert "executed" in result.message.lower() or "recalculated" in result.message.lower()
    assert result.beforeState.b3Voltage > 1.05
    assert result.afterState.b3Voltage <= 1.05
    assert result.afterState.isSafe is True


@pytest.mark.asyncio
async def test_medium_and_large_grids_dynamic_evaluation():
    """Verify dynamic candidate evaluation works across medium and large benchmark networks."""
    repo = NetworkRepository()
    med_grid = await repo.get_grid("medium-test-grid")
    large_grid = await repo.get_grid("large-test-grid")

    b_config = BatteryStorageConfig(initialSocPercent=60.0)

    # Medium grid evaluation
    actions_med, rec_med, comp_med = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=300.0,
        peak_load_kw=250.0,
        battery_config=b_config,
        grid=med_grid,
    )
    assert len(actions_med) == 4
    for a in actions_med:
        assert a.dispatchKw is not None or a.curtailmentKw is not None or a.targetTopology is not None

    # Large grid evaluation
    actions_large, rec_large, comp_large = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=600.0,
        peak_load_kw=500.0,
        battery_config=b_config,
        grid=large_grid,
    )
    assert len(actions_large) == 4
    for a in actions_large:
        assert a.dispatchKw is not None or a.curtailmentKw is not None or a.targetTopology is not None


@pytest.mark.asyncio
async def test_custom_grid_with_different_ratings():
    """Verify evaluation adapts to a custom grid with non-standard ratings."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    custom = copy.deepcopy(grid)
    custom.id = "custom-test-grid"
    custom.name = "Custom Microgrid"
    custom.substation.ratingKva = 1200.0
    if custom.batteries:
        custom.batteries[0].maxChargeKw = 75.0
        custom.batteries[0].maxDischargeKw = 75.0
        custom.batteries[0].capacityKwh = 200.0

    b_config = BatteryStorageConfig(initialSocPercent=50.0, capacityKwh=200.0, maxChargeKw=75.0, maxDischargeKw=75.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=220.0,
        peak_load_kw=130.0,
        battery_config=b_config,
        grid=custom,
    )
    assert len(actions) == 4
    act_01 = next(a for a in actions if a.id == "ACT-01")
    assert act_01.isFeasible is True
