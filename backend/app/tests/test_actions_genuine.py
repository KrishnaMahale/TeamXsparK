"""
Tests for Phase 2 — Genuine Corrective-Action Evaluation and Execution.

Verifies:
1. Candidate evaluation does not mutate the baseline grid state.
2. Evaluating multiple candidates starts from the identical baseline state.
3. Actions that fail to improve or violate constraints are reported honestly (never fabricated success).
4. Remaining violations are derived from ConstraintChecker and never artificially zeroed.
5. Active-power curtailment runs the genuine solver with reduced active generation.
6. Battery dispatch respects power and SOC limits (cannot charge when full, cannot discharge when empty).
7. Transformer overload is verified after corrective action power flow calculations.
8. An action that leaves or creates a transformer overload is not marked safe.
9. Execute endpoint performs actual recalculation rather than echoing pre-stored numbers.
10. Infeasible actions are rejected during execution.
"""

import copy
import pytest
from app.db.repositories.network_repository import NetworkRepository
from app.engine.actions import ActionEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.services.action_service import ActionService
from app.services.simulation_service import get_active_simulation
from app.schemas.battery import BatteryStorageConfig
from app.schemas.network import GridNetwork, Transformer
from app.schemas.simulation import NetworkLimitsConfig


@pytest.mark.asyncio
async def test_candidate_evaluation_does_not_mutate_baseline_grid():
    """Verify that ActionEngine.evaluate_candidate_actions does not mutate the baseline grid."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    assert grid is not None

    grid_snapshot_before = grid.model_dump()
    b_config = BatteryStorageConfig(initialSocPercent=62.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    grid_snapshot_after = grid.model_dump()

    # The baseline grid object must remain completely unmutated
    assert grid_snapshot_before == grid_snapshot_after
    assert len(actions) == 4


@pytest.mark.asyncio
async def test_evaluating_multiple_candidates_starts_from_same_baseline():
    """Verify that every candidate action is evaluated starting from the same baseline state."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=62.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    # All actions must evaluate against the same baseline violations count
    base_viols = comp.beforeViolationsCount
    assert base_viols is not None
    assert base_viols > 0

    for a in actions:
        assert a.resolvedViolationsCount + a.remainingViolationsCount >= 0
        if a.isFeasible:
            assert a.resolvedViolationsCount <= base_viols


@pytest.mark.asyncio
async def test_action_that_fails_is_not_reported_as_successful():
    """Verify that an infeasible action (ACT-04) is reported as infeasible with a valid reason."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=15.0)  # Below 20% safe reserve floor

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    act_04 = next(a for a in actions if a.id == "ACT-04")
    assert act_04.isFeasible is False
    assert act_04.infeasibleReason is not None
    assert "safe reserve floor" in act_04.infeasibleReason or "exceeds" in act_04.infeasibleReason
    # Infeasible action must never claim resolved violations
    assert act_04.resolvedViolationsCount == 0


@pytest.mark.asyncio
async def test_remaining_violations_never_manually_zeroed():
    """Verify that an action leaving violations reports the genuine non-zero count."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Infeasible battery reserve: ACT-01 cannot charge if initialSoc is already 96%
    b_config = BatteryStorageConfig(initialSocPercent=96.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    act_01 = next(a for a in actions if a.id == "ACT-01")
    assert act_01.isFeasible is False
    assert act_01.remainingViolationsCount > 0
    assert act_01.resolvedViolationsCount == 0


@pytest.mark.asyncio
async def test_active_power_curtailment_triggers_solver_rerun():
    """Verify that solar curtailment (ACT-03) reduces active generation and uses real solver outputs."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    b_config = BatteryStorageConfig(initialSocPercent=62.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid,
    )

    act_03 = next(a for a in actions if a.id == "ACT-03")
    assert act_03.isFeasible is True
    assert act_03.type == "solar_curtailment"
    assert "Curtailment" in act_03.title
    assert act_03.solarUsedKw < 240.0  # Actually curtailed
    assert act_03.renewableUtilizationPercent < 100.0

    # Verify that expectedVoltagePu matches genuine solver output at the curtailed solar amount
    pf = PowerFlowEngine(is_alternative_topology=False)
    curtailed_kw = 240.0 - act_03.solarUsedKw
    buses, _, _, _ = pf.solve(grid=grid, solar_kw=240.0, load_kw=120.0, solar_curtailment_kw=curtailed_kw)
    v_b3_solver = next(b.voltage for b in buses if b.id == "B3")
    assert abs(act_03.expectedVoltagePu - v_b3_solver) < 0.005


@pytest.mark.asyncio
async def test_battery_dispatch_respects_soc_limits():
    """Verify battery cannot charge when full and cannot discharge when empty."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # High SOC (96%): should reject charging under solar surplus
    b_full = BatteryStorageConfig(initialSocPercent=96.0)
    actions_full, _, _ = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0, peak_load_kw=120.0, battery_config=b_full, grid=grid
    )
    act_full = next(a for a in actions_full if a.id == "ACT-01")
    assert act_full.isFeasible is False

    # Low SOC (15%): should reject discharging under peak load
    b_empty = BatteryStorageConfig(initialSocPercent=15.0)
    actions_empty, _, _ = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=0.0, peak_load_kw=200.0, battery_config=b_empty, grid=grid
    )
    act_empty = next(a for a in actions_empty if a.id == "ACT-01")
    assert act_empty.isFeasible is False


@pytest.mark.asyncio
async def test_transformer_overload_checked_after_corrective_actions():
    """Verify that transformer loading is evaluated and reported in action constraints."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    # Lower transformer rating to 60 kVA so that net flow (72-81 kVA) produces overload
    grid_tx_low = copy.deepcopy(grid)
    grid_tx_low.substation.ratingKva = 60.0

    b_config = BatteryStorageConfig(initialSocPercent=60.0)
    actions, _, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid_tx_low,
    )

    # Because transformer is severely undersized (60 kVA), actions should still have remaining violations
    for a in actions:
        assert a.remainingViolationsCount > 0
    assert comp.isSafe is False


@pytest.mark.asyncio
async def test_action_resolving_voltage_but_leaving_tx_overload_is_not_safe():
    """Verify that an action resolving voltage but leaving a transformer overload is not marked safe."""
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")

    grid_small_tx = copy.deepcopy(grid)
    grid_small_tx.substation.ratingKva = 60.0  # Severe overload at net flow

    b_config = BatteryStorageConfig(initialSocPercent=60.0)
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=grid_small_tx,
    )

    rec_act = next(a for a in actions if a.id == rec_id)
    # Even if voltage is corrected, transformer overload remains
    assert comp.isSafe is False
    assert comp.afterViolationsCount > 0


@pytest.mark.asyncio
async def test_execute_endpoint_performs_actual_recalculation():
    """Verify that ActionService.execute_action executes the real solver and returns measured states."""
    service = ActionService()
    result = await service.execute_action("ACT-02", grid_id="default-grid")

    assert result.actionId == "ACT-02"
    assert result.success is True
    assert result.beforeState.b3Voltage > 1.05
    assert result.afterState.b3Voltage <= 1.05
    assert "recalculated" in result.message.lower() or "executed" in result.message.lower()

    # Check that afterState measured values match physical power flow run by the service
    sim = get_active_simulation()
    load_used = sim.summary.loadKw if (sim and hasattr(sim, "summary")) else 120.0
    pf = PowerFlowEngine(is_alternative_topology=True)
    repo = NetworkRepository()
    grid = await repo.get_grid("default-grid")
    buses, feeders, _, _ = pf.solve(grid=grid, solar_kw=result.beforeState.solarUsedKw, load_kw=load_used)
    v_measured = next(b.voltage for b in buses if b.id == "B3")
    assert abs(result.afterState.b3Voltage - v_measured) < 0.005


@pytest.mark.asyncio
async def test_infeasible_action_execution_rejection():
    """Verify that executing an infeasible action (ACT-04) returns success=False without altering state."""
    service = ActionService()
    result = await service.execute_action("ACT-04", grid_id="default-grid")

    assert result.actionId == "ACT-04"
    assert result.success is False
    assert result.afterState.isSafe is False
    assert "rejected" in result.message.lower()
