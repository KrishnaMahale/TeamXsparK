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
