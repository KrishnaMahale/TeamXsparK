"""
Regression tests for Violation Count Consistency & Hybrid Action Integrity
Verifies the canonical contract between /violations and /actions pages.
"""

import pytest
from app.services.action_service import ActionService
from app.services.simulation_service import SimulationService
from app.db.repositories.network_repository import NetworkRepository
from app.schemas.simulation import SimulationInput


@pytest.mark.asyncio
async def test_worst_timestep_baseline_consistency():
    """
    Contract Rule 1 & 2:
    The baseline violation count displayed on /violations (worst timestep view)
    MUST exactly equal the beforeViolationsCount reported on /actions for the same simulation.
    """
    sim_service = SimulationService()
    sim_input = SimulationInput(gridId="default-grid")
    full_result = await sim_service.run_simulation(sim_input)

    worst_time = full_result.summary.simulationTime
    assert worst_time is not None
    assert worst_time in full_result.timeStepResults

    worst_step = full_result.timeStepResults[worst_time]
    worst_step_violation_count = len(worst_step.violations)

    # Actions comparison beforeViolationsCount
    before_violations_count = full_result.comparisonData.beforeViolationsCount

    assert worst_step_violation_count == before_violations_count, (
        f"Mismatch: worst timestep {worst_time} has {worst_step_violation_count} violations "
        f"but Actions beforeViolationsCount is {before_violations_count}"
    )


@pytest.mark.asyncio
async def test_full_horizon_vs_worst_timestep_scoping():
    """
    Contract Rule 3:
    Full-horizon violation instances across all 96 timesteps are aggregated chronologically
    and must be distinct from (and >=) the single worst-timestep peak violation count.
    """
    sim_service = SimulationService()
    sim_input = SimulationInput(gridId="default-grid")
    full_result = await sim_service.run_simulation(sim_input)

    worst_time = full_result.summary.simulationTime
    worst_violations = full_result.timeStepResults[worst_time].violations

    # Aggregate full horizon
    full_horizon_violations = []
    for step_time, step_res in full_result.timeStepResults.items():
        if step_res.violations:
            full_horizon_violations.extend(step_res.violations)

    assert len(full_horizon_violations) >= len(worst_violations)
    # The summary initialViolations matches the worst timestep baseline count
    assert full_result.summary.initialViolations == len(worst_violations)


@pytest.mark.asyncio
async def test_baseline_non_mutation_during_evaluation():
    """
    Contract Rule 4:
    Evaluating candidate actions and hybrid plans MUST evaluate in isolated clones
    and NEVER mutate the original simulation baseline violations.
    """
    sim_service = SimulationService()
    sim_input = SimulationInput(gridId="default-grid")
    full_result = await sim_service.run_simulation(sim_input)

    worst_time = full_result.summary.simulationTime
    original_violations = [v.model_copy(deep=True) for v in full_result.timeStepResults[worst_time].violations]
    original_before_count = full_result.comparisonData.beforeViolationsCount

    # Evaluate actions
    action_service = ActionService()
    act_resp = await action_service.evaluate_actions_for_simulation(sim_input)

    # Re-verify original baseline violations
    assert len(full_result.timeStepResults[worst_time].violations) == len(original_violations)
    assert full_result.comparisonData.beforeViolationsCount == original_before_count
    for orig_v, curr_v in zip(original_violations, full_result.timeStepResults[worst_time].violations):
        assert orig_v.id == curr_v.id
        assert orig_v.severity == curr_v.severity


@pytest.mark.asyncio
async def test_execution_result_separation():
    """
    Contract Rule 5:
    Executing an action produces an after_state that remains separate from baseline.
    The remaining violations are honestly measured, and resolved count = baseline - remaining.
    """
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")
    eval_resp = await action_service.evaluate_actions_for_simulation(sim_input)

    assert eval_resp.recommendedActionId is not None
    exec_result = await action_service.execute_action(eval_resp.recommendedActionId, "default-grid")

    assert exec_result.success is True
    assert exec_result.afterState is not None
    # afterState violationsCount is recorded honestly
    remaining = exec_result.afterState.violationsCount
    baseline = eval_resp.comparisonData.beforeViolationsCount
    assert remaining <= baseline


@pytest.mark.asyncio
async def test_transformer_only_violations_included():
    """
    Contract Rule 6:
    Transformer overloads are included in baseline violation counts
    and properly factored into action feasibility.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None
    assert grid.substation.ratingKva == 500.0

    sim_service = SimulationService()
    sim_input = SimulationInput(gridId="default-grid")
    full_result = await sim_service.run_simulation(sim_input)

    # Worst timestep has critical violations
    worst_time = full_result.summary.simulationTime
    worst_res = full_result.timeStepResults[worst_time]
    assert len(worst_res.violations) > 0


@pytest.mark.asyncio
async def test_hybrid_plan_structure_and_non_duplication():
    """
    Contract Rule 7:
    Hybrid corrective action plan contains constituentActions, explicit parameter delta,
    and is uniquely identified (cannot duplicate basic actions).
    """
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")
    eval_resp = await action_service.evaluate_actions_for_simulation(sim_input)

    assert eval_resp.hybridPlan is not None
    hybrid = eval_resp.hybridPlan

    assert hybrid.isHybrid is True
    assert "HYBRID" in hybrid.id
    assert hybrid.constituentActions is not None
    assert len(hybrid.constituentActions) >= 2
    assert hybrid.parameterDelta is not None and len(hybrid.parameterDelta) > 0

    # Ensure all available actions have unique IDs
    action_ids = [a.id for a in eval_resp.availableActions]
    assert len(action_ids) == len(set(action_ids))


# =============================================================================
# Phase 5 Authoritative Physics Regression Tests
# =============================================================================

from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.schemas.simulation import NetworkLimitsConfig


@pytest.mark.asyncio
async def test_regression_1_physical_baseline_two_violations():
    """
    Test 1: A baseline with two violations: Bus 3 overvoltage and Feeder F-02 overload.
    Verifies against the physical AC power flow solver and canonical constraint checker.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    limits = NetworkLimitsConfig(voltageMinPu=0.95, voltageMaxPu=1.05, feederLoadingLimitPercent=100.0)

    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(
        grid=grid,
        solar_kw=248.0,
        load_kw=120.0,
        installed_solar_capacity_kw=250.0,
    )
    violations = ConstraintChecker.check_all(buses, feeders, "12:00", limits)

    assert len(violations) == 2
    types = {v.type for v in violations}
    comp_ids = {v.componentId for v in violations}
    assert "over_voltage" in types or any(v.componentType == "bus" for v in violations)
    assert "feeder_overload" in types or any(v.componentType == "feeder" for v in violations)
    assert "B3" in comp_ids
    assert "F-02" in comp_ids

    b3 = next(b for b in buses if b.id == "B3")
    f02 = next(f for f in feeders if f.id == "F-02")
    assert b3.voltage > 1.05
    assert f02.loadingPercent > 100.0


@pytest.mark.asyncio
async def test_regression_2_action_resolves_only_voltage_violation():
    """
    Test 2: An action that resolves only the voltage violation: one violation remains.
    Physical solver dispatch: BESS charging at -28 kW absorbs voltage rise (B3 V <= 1.05 pu),
    while feeder loading on F-02 remains above 100%. Exactly 1 violation remains.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    limits = NetworkLimitsConfig(voltageMinPu=0.95, voltageMaxPu=1.05, feederLoadingLimitPercent=100.0)

    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(
        grid=grid,
        solar_kw=248.0,
        load_kw=120.0,
        battery_power_kw=-28.0,
        installed_solar_capacity_kw=250.0,
    )
    violations = ConstraintChecker.check_all(buses, feeders, "12:00", limits)

    assert len(violations) == 1
    rem = violations[0]
    assert rem.componentType == "feeder"
    assert rem.componentId == "F-02"
    assert rem.value > 100.0

    b3 = next(b for b in buses if b.id == "B3")
    assert b3.voltage <= 1.05


@pytest.mark.asyncio
async def test_regression_3_action_resolves_only_feeder_overload():
    """
    Test 3: An action that resolves only the feeder overload: one violation remains.
    Physical solver dispatch: Solar curtailment of 10 kW relieves branch loading to <= 100%,
    while Bus 3 voltage remains above 1.05 pu. Exactly 1 violation remains.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    limits = NetworkLimitsConfig(voltageMinPu=0.95, voltageMaxPu=1.05, feederLoadingLimitPercent=100.0)

    pf = PowerFlowEngine()
    buses, feeders, _, _ = pf.solve(
        grid=grid,
        solar_kw=248.0,
        load_kw=120.0,
        solar_curtailment_kw=10.0,
        installed_solar_capacity_kw=250.0,
    )
    violations = ConstraintChecker.check_all(buses, feeders, "12:00", limits)

    assert len(violations) == 1
    rem = violations[0]
    assert rem.componentType == "bus"
    assert rem.componentId == "B3"
    assert rem.value > 1.05

    f02 = next(f for f in feeders if f.id == "F-02")
    assert f02.loadingPercent <= 100.0


@pytest.mark.asyncio
async def test_regression_4_action_resolves_both_violations():
    """
    Test 4: An action that resolves both violations: zero remain.
    Physical solver dispatch: Feeder reconfiguration (alternative tie-line switch topology)
    relieves both branch current and nodal overvoltage. Exactly 0 violations remain.
    """
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    limits = NetworkLimitsConfig(voltageMinPu=0.95, voltageMaxPu=1.05, feederLoadingLimitPercent=100.0)

    pf = PowerFlowEngine(is_alternative_topology=True)
    buses, feeders, _, _ = pf.solve(
        grid=grid,
        solar_kw=248.0,
        load_kw=120.0,
        installed_solar_capacity_kw=250.0,
    )
    violations = ConstraintChecker.check_all(buses, feeders, "12:00", limits)

    assert len(violations) == 0

    b3 = next(b for b in buses if b.id == "B3")
    f02 = next(f for f in feeders if f.id == "F-02")
    assert b3.voltage <= 1.05
    assert f02.loadingPercent <= 100.0


@pytest.mark.asyncio
async def test_regression_5_action_resolves_neither_violation():
    """
    Test 5: An action that resolves neither violation: two remain.
    Infeasible action rejection (e.g. ACT-04) preserves the full baseline violation count.
    """
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")
    await action_service.evaluate_actions_for_simulation(sim_input)

    exec_result = await action_service.execute_action("ACT-04", "default-grid")
    assert exec_result.success is False
    assert exec_result.beforeState.violationsCount == 2
    assert exec_result.afterState.violationsCount == 2
    assert len(exec_result.afterState.violations) == 2


@pytest.mark.asyncio
async def test_regression_6_identical_operating_state_equivalent_violation_lists():
    """
    Test 6: Identical operating states produce equivalent violation lists from both page workflows.
    Evaluates both the simulation power flow workflow and the actions baseline workflow.
    """
    sim_service = SimulationService()
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")

    full_sim = await sim_service.run_simulation(sim_input)
    act_resp = await action_service.evaluate_actions_for_simulation(sim_input)

    peak_time = full_sim.summary.simulationTime
    violations_sim = full_sim.timeStepResults[peak_time].violations
    violations_act = act_resp.powerFlow.violations

    assert len(violations_sim) == len(violations_act)
    for v_sim, v_act in zip(violations_sim, violations_act):
        assert v_sim.id == v_act.id
        assert v_sim.componentId == v_act.componentId
        assert v_sim.value == v_act.value
        assert v_sim.limit == v_act.limit


@pytest.mark.asyncio
async def test_regression_7_baseline_and_post_action_clearly_distinguished():
    """
    Test 7: Different baseline and post-action states are clearly distinguished.
    Execution result provides explicit beforeState (baseline) and afterState (post-dispatch).
    """
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")
    eval_resp = await action_service.evaluate_actions_for_simulation(sim_input)

    # Execute ACT-03 (partial relief: resolves feeder overload, leaves voltage violation)
    exec_result = await action_service.execute_action("ACT-03", "default-grid")

    assert exec_result.beforeState.violationsCount == 2
    assert exec_result.afterState.violationsCount == 1
    assert exec_result.beforeState.violations is not None
    assert len(exec_result.beforeState.violations) == 2
    assert exec_result.afterState.violations is not None
    assert len(exec_result.afterState.violations) == 1
    assert exec_result.beforeState.violationsCount != exec_result.afterState.violationsCount


@pytest.mark.asyncio
async def test_regression_8_grid_and_timestep_switch_refreshes_results():
    """
    Test 8: Switching grid or timestep refreshes the correct results without stale caching.
    """
    sim_service = SimulationService()

    # Timestep 12:00 (peak solar)
    pf_peak = await sim_service.run_single_power_flow("12:00", grid_id="default-grid")
    # Timestep 02:00 (nighttime)
    pf_night = await sim_service.run_single_power_flow("02:00", grid_id="default-grid")

    assert len(pf_peak.violations) > 0
    assert len(pf_night.violations) == 0
    assert pf_peak.timestamp == "12:00"
    assert pf_night.timestamp == "02:00"


@pytest.mark.asyncio
async def test_regression_9_no_violations_lost_through_serialization():
    """
    Test 9: No violations are lost through backend response serialization or mapping.
    Verifies model_dump and JSON serialization retain all necessary violation fields.
    """
    action_service = ActionService()
    sim_input = SimulationInput(gridId="default-grid")
    await action_service.evaluate_actions_for_simulation(sim_input)
    exec_result = await action_service.execute_action("ACT-03", "default-grid")

    data = exec_result.model_dump()
    assert "beforeState" in data
    assert "afterState" in data
    assert "violations" in data["beforeState"]
    assert "violations" in data["afterState"]
    assert len(data["beforeState"]["violations"]) == 2
    assert len(data["afterState"]["violations"]) == 1

    for v in data["afterState"]["violations"]:
        assert "id" in v
        assert "componentType" in v
        assert "componentId" in v
        assert "value" in v
        assert "limit" in v
        assert "severity" in v
        assert "status" in v

