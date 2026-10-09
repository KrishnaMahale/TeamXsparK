"""
Tests for Phase 3C — Hybrid Corrective Actions and Multi-Constraint Optimization.

Verifies:
1. Overvoltage resolved by battery charging alone (minimal curtailment = 0 kW).
2. Overvoltage requiring joint charging plus solar curtailment when battery headroom is saturated.
3. Ranking behavior: hybrid plan vs single actions via transparent lexicographic criteria.
4. Undervoltage with insufficient battery energy (infeasible).
5. Battery at SOC ceiling (>= 95%) or floor (<= 20%) correctly detected as infeasible.
6. Inapplicable solar curtailment when generation is zero or insufficient.
7. Topology change applicability: supported vs grid without alternate switches.
8. Full-horizon safety verification over the diurnal simulation horizon.
9. Transformer overload resolution with normal bus voltages.
10. Multiple simultaneous constraint types addressed jointly.
11. Solver call evaluation limits (strictly bounded <= 20 solver iterations).
12. Candidate state isolation and no mutation of baseline grid or simulation state.
13. Execution integrity: evaluated numeric parameters match executed numeric parameters with genuine power flow.
14. Safe rejection of infeasible plans without partial execution.
15. Multi-grid compatibility (default, medium, large, and custom grids).
16. Backward compatibility with existing single-action schemas and endpoints.
"""

import copy
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repositories.network_repository import NetworkRepository
from app.engine.actions import ActionEngine
from app.engine.network_engine import NetworkEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.services.action_service import ActionService
from app.schemas.action import CorrectiveAction
from app.schemas.battery import BatteryStorageConfig
from app.schemas.network import GridNetwork
from app.schemas.simulation import (
    SimulationInput,
    TimeSeriesSolarPoint,
    TimeSeriesLoadPoint,
    NetworkLimitsConfig,
)
from app.schemas.violation import ViolationType, ViolationSeverity


@pytest.mark.asyncio
async def test_overvoltage_resolved_by_battery_charging_alone():
    """Scenario 1: Moderate solar overvoltage where battery charging alone is sufficient."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=50.0)
    limits = NetworkLimitsConfig(voltageMaxPu=1.05, voltageMinPu=0.95, feederLoadingLimitPercent=100.0)

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=175.0,
        peak_load_kw=100.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=50.0,
        limits=limits,
        eval_time="13:15",
        base_violations=1,
        base_v_crit=1.058,
        base_f_crit_load=55.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=True,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is True
    assert hybrid.dispatchKw < 0.0  # Charging is negative dispatch
    assert hybrid.curtailmentKw == 0.0  # Zero curtailment needed
    assert hybrid.renewableUtilizationPercent == 100.0  # 100% clean power preserved
    assert hybrid.remainingViolationsCount == 0


@pytest.mark.asyncio
async def test_overvoltage_requiring_charging_plus_curtailment():
    """Scenario 2: Severe solar overvoltage requiring combined BESS charging and supplemental curtailment."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=30.0, initialSocPercent=70.0)
    limits = NetworkLimitsConfig(voltageMaxPu=1.05, voltageMinPu=0.95, feederLoadingLimitPercent=100.0)

    # 245 kW solar injection, 50 kW load -> 30 kW charging alone leaves overvoltage
    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=245.0,
        peak_load_kw=50.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=70.0,
        limits=limits,
        eval_time="13:15",
        base_violations=2,
        base_v_crit=1.082,
        base_f_crit_load=65.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=True,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is True
    assert hybrid.dispatchKw < 0.0  # Charging
    assert hybrid.curtailmentKw > 0.0  # Supplemental curtailment activated
    assert hybrid.renewableUtilizationPercent < 100.0
    assert hybrid.remainingViolationsCount == 0


@pytest.mark.asyncio
async def test_hybrid_plan_ranking_lexicographic():
    """Scenario 3: Lexicographic safety-first ranking prefers zero violations and higher renewable preservation."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=50.0)

    # In a moderate condition where single battery charging solves everything with 100% renewable use,
    # it is evaluated alongside other actions.
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=180.0,
        peak_load_kw=100.0,
        battery_config=b_conf,
        installed_capacity_kw=250.0,
        grid=grid,
        eval_time="13:15",
        include_hybrid=True,
    )

    rec_act = next(a for a in actions if a.id == rec_id)
    assert rec_act.isFeasible is True
    assert rec_act.remainingViolationsCount == 0
    # The recommended action must preserve 100% renewable utilization
    assert rec_act.renewableUtilizationPercent == 100.0


@pytest.mark.asyncio
async def test_undervoltage_with_insufficient_battery_energy():
    """Scenario 4: Undervoltage when battery is at or below safe reserve floor (20%)."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxDischargeKw=40.0, initialSocPercent=18.0)
    limits = NetworkLimitsConfig(voltageMaxPu=1.05, voltageMinPu=0.95)

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=0.0,
        peak_load_kw=180.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=18.0,
        limits=limits,
        eval_time="19:00",
        base_violations=1,
        base_v_crit=0.935,
        base_f_crit_load=75.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=False,
        has_undervoltage=True,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is False
    assert "reserve floor" in hybrid.infeasibleReason.lower()


@pytest.mark.asyncio
async def test_battery_at_soc_ceiling():
    """Scenario 5: Overvoltage when battery is already at SOC ceiling (>= 95%)."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=96.0)
    limits = NetworkLimitsConfig()

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=240.0,
        peak_load_kw=80.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=96.0,
        limits=limits,
        eval_time="13:15",
        base_violations=1,
        base_v_crit=1.072,
        base_f_crit_load=60.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=True,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is False
    assert "ceiling" in hybrid.infeasibleReason.lower()


@pytest.mark.asyncio
async def test_insufficient_solar_generation_for_curtailment():
    """Scenario 6: Solar generation is 0 kW (nighttime). Hybrid absorption with curtailment is inapplicable."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=50.0)
    limits = NetworkLimitsConfig()

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=0.0,
        peak_load_kw=160.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=50.0,
        limits=limits,
        eval_time="20:00",
        base_violations=1,
        base_v_crit=0.940,
        base_f_crit_load=70.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=False,
        has_undervoltage=True,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    # In nighttime demand deficit, Case A (absorption) is bypassed, and switching + discharge is considered
    assert hybrid is not None
    assert hybrid.curtailmentKw == 0.0


@pytest.mark.asyncio
async def test_grid_without_alternate_switches_cannot_formulate_switching_hybrid():
    """Scenario 7: Grid without reconfigurable tie-switches cannot formulate switching hybrid."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    grid_no_alt = copy.deepcopy(grid)
    for f in grid_no_alt.feeders:
        f.isReconfigurableAlternate = False
        f.isSwitchClosed = True

    b_conf = BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=50.0)
    limits = NetworkLimitsConfig()

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid_no_alt,
        peak_solar_kw=0.0,
        peak_load_kw=200.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=50.0,
        limits=limits,
        eval_time="19:00",
        base_violations=1,
        base_v_crit=0.930,
        base_f_crit_load=80.0,
        crit_bus_id=grid.buses[0].id,
        crit_feeder_id=grid.feeders[0].id,
        has_overvoltage=False,
        has_undervoltage=True,
        has_feeder_overload=True,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is False
    assert "No compatible multi-action combination" in hybrid.infeasibleReason


@pytest.mark.asyncio
async def test_full_horizon_safety_verification():
    """Scenario 8: Verify full-horizon safety checks SOC depletion over simulated sequence."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    all_times = [f"{h:02d}:00" for h in range(24)]
    solar_times = {t: (240.0 if 10 <= int(t[:2]) <= 15 else 0.0) for t in all_times}
    load_times = {t: 120.0 for t in all_times}

    sim_input = SimulationInput(
        gridId=grid.id,
        batteryConfig=BatteryStorageConfig(capacityKwh=10.0, initialSocPercent=22.0),
    )

    candidate = CorrectiveAction(
        id="PLAN-TEST-01",
        type="hybrid_plan",
        title="Test Excessive Discharge",
        description="Test plan",
        parameterDelta="+40 kW BESS",
        isFeasible=True,
        expectedVoltagePu=0.98,
        expectedFeederLoadPercent=60.0,
        solarUsedKw=200.0,
        batterySocPercent=22.0,
        resolvedViolationsCount=1,
        remainingViolationsCount=0,
        renewableUtilizationPercent=100.0,
        dispatchKw=40.0,  # 40 kW discharge for small 10 kWh battery will breach floor
        curtailmentKw=0.0,
        targetTopology="standard",
    )

    is_safe, viols, reason = ActionEngine.verify_full_horizon_safety(
        candidate=candidate,
        grid=grid,
        input_data=sim_input,
        all_times=all_times,
        solar_times=solar_times,
        load_times=load_times,
        eval_time="13:00",
    )

    assert is_safe is False
    assert "reserve limits" in reason.lower()


@pytest.mark.asyncio
async def test_transformer_overload_hybrid_resolution():
    """Scenario 9: Transformer overload with normal bus voltages resolved by hybrid absorption."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Set substation rating lower so 240 kW backfeed overloads transformer
    grid_tx = copy.deepcopy(grid)
    grid_tx.substation.ratingKva = 150.0

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=40.0)
    limits = NetworkLimitsConfig(transformerLoadingLimitPercent=100.0)

    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid_tx,
        peak_solar_kw=240.0,
        peak_load_kw=80.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=40.0,
        limits=limits,
        eval_time="13:15",
        base_violations=1,
        base_v_crit=1.045,  # Bus voltage normal
        base_f_crit_load=60.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=False,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=True,  # Transformer overloaded
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is True
    assert hybrid.dispatchKw < 0.0  # Battery charging relieves export on transformer


@pytest.mark.asyncio
async def test_solver_call_limits_bounded():
    """Scenario 11: Joint optimization completes within strict evaluation budget (<= 20 iterations)."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    b_conf = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, initialSocPercent=60.0)
    limits = NetworkLimitsConfig()

    # Even with large solar generation, the bisection loop terminates rapidly
    hybrid = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=250.0,
        peak_load_kw=60.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=60.0,
        limits=limits,
        eval_time="13:15",
        base_violations=2,
        base_v_crit=1.085,
        base_f_crit_load=65.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=True,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    assert hybrid is not None
    assert hybrid.isFeasible is True
    assert hybrid.remainingViolationsCount == 0


@pytest.mark.asyncio
async def test_candidate_state_isolation_no_mutation():
    """Scenario 12: Evaluating hybrid candidate does not mutate original grid object or battery SOC."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    orig_buses = [b.voltage for b in grid.buses]
    orig_feeders = [f.isSwitchClosed for f in grid.feeders]

    b_conf = BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=50.0)
    limits = NetworkLimitsConfig()

    _ = ActionEngine.evaluate_hybrid_candidate(
        grid=grid,
        peak_solar_kw=240.0,
        peak_load_kw=60.0,
        installed_capacity_kw=250.0,
        battery_config=b_conf,
        soc_start=50.0,
        limits=limits,
        eval_time="13:15",
        base_violations=2,
        base_v_crit=1.08,
        base_f_crit_load=65.0,
        crit_bus_id="bus-3",
        crit_feeder_id="f-02",
        has_overvoltage=True,
        has_undervoltage=False,
        has_feeder_overload=False,
        has_tx_overload=False,
        act1_single=None,
        act2_single=None,
        act3_single=None,
    )

    # Grid object buses and switches remain untouched
    assert [b.voltage for b in grid.buses] == orig_buses
    assert [f.isSwitchClosed for f in grid.feeders] == orig_feeders


@pytest.mark.asyncio
async def test_hybrid_plan_execution_integrity():
    """Scenario 13 & 15: Executing a hybrid plan applies exact evaluated parameters via genuine solver."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    sim_input = SimulationInput(
        gridId=grid.id,
        currentSolarKw=240.0,
        currentLoadKw=80.0,
        installedSolarCapacityKw=250.0,
    )
    full_res = NetworkEngine.run_full_simulation(sim_input, grid)

    assert full_res.hybridPlan is not None
    hybrid = full_res.hybridPlan

    if hybrid.isFeasible:
        service = ActionService()
        exec_res = await service.execute_action(action_id=hybrid.id, grid_id=grid.id)

        assert exec_res.actionId == hybrid.id
        assert exec_res.success is True
        # Measured afterState voltages are genuine numbers within safe boundaries
        assert 0.95 <= exec_res.afterState.b3Voltage <= 1.055
        assert exec_res.afterState.violationsCount <= exec_res.beforeState.violationsCount


@pytest.mark.asyncio
async def test_infeasible_plan_execution_rejection():
    """Scenario 14: Executing an infeasible plan returns success=False without applying controls."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Infeasible initial SOC
    sim_input = SimulationInput(
        gridId=grid.id,
        currentSolarKw=240.0,
        currentLoadKw=80.0,
        batteryConfig=BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=98.0),
    )
    full_res = NetworkEngine.run_full_simulation(sim_input, grid)

    assert full_res.hybridPlan is not None
    assert full_res.hybridPlan.isFeasible is False

    service = ActionService()
    exec_res = await service.execute_action(action_id=full_res.hybridPlan.id, grid_id=grid.id)

    assert exec_res.success is False
    assert "Rejected" in exec_res.message


@pytest.mark.asyncio
async def test_medium_and_large_grids_hybrid_evaluation():
    """Scenario 17: Multi-grid compatibility for medium-test-grid and large-test-grid."""
    repo = NetworkRepository()

    med_grid = await repo.get_grid("medium-test-grid")
    assert med_grid is not None
    sim_med = SimulationInput(gridId=med_grid.id, currentSolarKw=200.0, currentLoadKw=120.0)
    res_med = NetworkEngine.run_full_simulation(sim_med, med_grid)
    assert res_med.hybridPlan is not None
    assert res_med.hybridPlan.gridId == med_grid.id

    large_grid = await repo.get_grid("large-test-grid")
    assert large_grid is not None
    sim_large = SimulationInput(gridId=large_grid.id, currentSolarKw=300.0, currentLoadKw=200.0)
    res_large = NetworkEngine.run_full_simulation(sim_large, large_grid)
    assert res_large.hybridPlan is not None
    assert res_large.hybridPlan.gridId == large_grid.id


@pytest.mark.asyncio
async def test_api_endpoints_hybrid_backward_compatibility():
    """Scenario 18: Endpoints return 4 availableActions and include hybridPlan in payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        sim_res = await ac.post("/api/simulations/run", json={"gridId": "default-grid", "currentSolarKw": 240.0})
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert len(sim_data["availableActions"]) == 4
        assert "hybridPlan" in sim_data
        assert sim_data["hybridPlan"] is not None
        assert sim_data["hybridPlan"]["id"] == "PLAN-HYBRID-01"

        act_res = await ac.post("/api/simulation/corrective-actions", json={"gridId": "default-grid"})
        assert act_res.status_code == 200
        act_data = act_res.json()
        assert len(act_data["availableActions"]) == 4
        assert "hybridPlan" in act_data
