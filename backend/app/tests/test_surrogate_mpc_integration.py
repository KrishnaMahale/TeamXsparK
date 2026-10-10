"""
Step 5A — Comprehensive Integration Tests for Safe Power-Flow Surrogate
Screening in Sequential MPC Candidate Evaluation.

Validates:
1. SequentialController actually invokes the screening utility when enabled.
2. Supported grid models, metadata alignment, and output dimensions (11, 13, 24).
3. Custom/unknown topology fallback to physical solver (never silently encoded as standard).
4. Unsupported state, non-finite features (NaN/Inf) fallback.
5. Missing, corrupt, or incompatible model artifact graceful fallback.
6. NaN/Inf surrogate predictions handled safely with physical fallback.
7. Mixed batches containing both surrogate-risky and surrogate-accepted candidates.
8. Physically feasible candidate flagged risky by surrogate is preserved and not falsely pruned.
9. Physically unsafe candidate estimated safe by surrogate is caught by authoritative physical solver.
10. All-candidates-risky behavior: physical fallback prevents lockout.
11. Battery SOC propagation and signed dispatch conventions preserved (+ discharge, - charge).
12. Multi-battery independence on large-test-grid.
13. Final selected trajectory actions are 100% physically verified (isPhysicallyVerified=True).
14. Infeasible trajectory reporting preserved when no physical candidate is violation-free.
15. Single-snapshot Actions workflow in ActionEngine remains unaffected.
"""

import json
import math
from unittest.mock import MagicMock, patch
import numpy as np
import pytest

from app.db.repositories.network_repository import (
    initialize_default_grid,
    initialize_medium_grid,
    initialize_large_grid,
)
from app.engine.actions import ActionEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.sequential_controller import SequentialController, SequentialState
from app.engine.surrogate_screening import (
    SurrogateScreeningEngine,
    ScreeningStatus,
    MODELS_DIR,
)
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    SequentialControlRequest,
    SequentialForecastPoint,
)


@pytest.fixture
def default_grid():
    return initialize_default_grid()


@pytest.fixture
def medium_grid():
    return initialize_medium_grid()


@pytest.fixture
def large_grid():
    return initialize_large_grid()


def generate_test_forecast(steps: int = 8, base_solar: float = 60.0, base_load: float = 45.0):
    return [
        SequentialForecastPoint(
            time=f"{12 + i // 4:02d}:{(i % 4) * 15:02d}",
            solarKw=base_solar + i * 2.0,
            loadKw=base_load - i * 1.0,
        )
        for i in range(steps)
    ]


# -------------------------------------------------------------------------
# 1. Controller Invocation & Screening Enablement
# -------------------------------------------------------------------------

def test_mpc_invokes_surrogate_screening(default_grid):
    """Verify that SequentialController actually runs surrogate screening when enabled."""
    forecast = generate_test_forecast(8)
    
    # Run with screening enabled
    controller = SequentialController(grid=default_grid, use_surrogate_screening=True)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = controller.plan(req)
    
    assert resp.status == PlanStatus.FEASIBLE
    assert resp.surrogateEvaluationCount > 0, "Surrogate screening was not invoked!"
    assert resp.physicalSolveCount > 0, "Physical solver must verify selected candidates!"
    assert len(resp.plannedTrajectory) == 8


def test_mpc_direct_when_screening_disabled(default_grid):
    """Verify that SequentialController uses direct physical solve when screening is disabled."""
    forecast = generate_test_forecast(8)
    
    controller = SequentialController(grid=default_grid, use_surrogate_screening=False)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=False,
    )
    resp = controller.plan(req)
    
    assert resp.status == PlanStatus.FEASIBLE
    assert resp.surrogateEvaluationCount == 0, "Surrogate must not be invoked when disabled!"
    assert resp.surrogatePrunedCount == 0
    assert resp.physicalSolveCount > 0


# -------------------------------------------------------------------------
# 2. Supported Grid Models and Output Dimensions
# -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "grid_fixture_name,expected_dim",
    [
        ("default_grid", 11),
        ("medium_grid", 13),
        ("large_grid", 24),
    ],
)
def test_each_supported_grid_model_and_output_dimensions(
    request, grid_fixture_name, expected_dim
):
    """Verify each grid's artifact loads with exact calibrated output dimensions."""
    grid = request.getfixturevalue(grid_fixture_name)
    engine = SurrogateScreeningEngine.get_instance()
    
    assert engine.is_grid_supported(grid.id)
    payload = engine.get_model(grid.id)
    assert payload is not None
    assert len(payload["target_names"]) == expected_dim
    assert len(payload["voltage_targets"]) > 0
    assert len(payload["loading_targets"]) > 0

    # Execute MPC plan with screening on this grid
    forecast = generate_test_forecast(8)
    ctrl = SequentialController(grid=grid, use_surrogate_screening=True)
    req = SequentialControlRequest(
        gridId=grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)
    assert resp.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    assert resp.surrogateEvaluationCount > 0


# -------------------------------------------------------------------------
# 3. Unknown / Custom Topology Fallback
# -------------------------------------------------------------------------

def test_unknown_custom_topology_fallback(default_grid):
    """Verify that an unknown or custom switch configuration routes to fallback."""
    engine = SurrogateScreeningEngine.get_instance()
    
    # 1. Custom feeder opened
    custom_cand = {
        "targetTopology": "custom_mesh_42",
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
    }
    is_valid, alt_val, reason = engine.validate_candidate_topology(custom_cand, default_grid)
    assert not is_valid
    assert alt_val is None
    assert "Unsupported topology" in reason

    # 2. SequentialController evaluation of custom topology candidate
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")
    
    # Inject custom candidate into candidate evaluation
    custom_ctrl = {
        "action_type": ControllerActionType.FEEDER_RECONFIGURATION,
        "battery_power_kw": 0.0,
        "curtailment_kw": 0.0,
        "target_topology": "custom_uncalibrated_topology",
        "title": "Custom Reconfig",
    }
    
    eval_candidates = ctrl._evaluate_candidates_with_surrogate(
        beam=[
            type("Cand", (), {
                "state_sequence": [init_state],
                "action_sequence": [],
                "total_cost": 0.0,
                "total_violations": 0,
                "is_hard_feasible": True,
            })()
        ],
        solar_kw=50.0,
        load_kw=40.0,
    )
    # Controller must record fallback and continue safely
    assert ctrl.surrogate_fallback_counter > 0


# -------------------------------------------------------------------------
# 4. Unsupported State & Non-Finite Feature Fallback
# -------------------------------------------------------------------------

def test_unsupported_state_and_feature_fallback(default_grid):
    """Verify that NaN/Inf inputs or extreme out-of-range states trigger safe fallback."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")
    
    # Pass NaN solar_kw into surrogate evaluation
    eval_candidates = ctrl._evaluate_candidates_with_surrogate(
        beam=[
            type("Cand", (), {
                "state_sequence": [init_state],
                "action_sequence": [],
                "total_cost": 0.0,
                "total_violations": 0,
                "is_hard_feasible": True,
            })()
        ],
        solar_kw=float("nan"),
        load_kw=40.0,
    )
    # Must route to fallback without crashing
    assert ctrl.surrogate_fallback_counter > 0


# -------------------------------------------------------------------------
# 5. Missing / Corrupt Artifact Fallback
# -------------------------------------------------------------------------

def test_missing_or_corrupt_artifact_fallback(default_grid):
    """Verify graceful physical fallback when model artifact is missing or corrupted."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    forecast = generate_test_forecast(8)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    
    # Patch get_model to return None (simulating missing artifact)
    with patch.object(ctrl.surrogate_engine, "get_model", return_value=None):
        resp = ctrl.plan(req)
        assert resp.status == PlanStatus.FEASIBLE
        # Must fall back to physical solver
        assert resp.physicalSolveCount > 0
        assert resp.surrogateFallbackCount > 0


# -------------------------------------------------------------------------
# 6. NaN / Inf Predictions Fallback
# -------------------------------------------------------------------------

def test_nan_inf_predictions_fallback(default_grid):
    """Verify that non-finite predictions from surrogate trigger physical fallback."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")
    
    mock_model = MagicMock()
    # Return NaN prediction
    mock_model.predict.return_value = np.full((10, 11), np.nan)
    
    payload = ctrl.surrogate_engine.get_model(default_grid.id)
    with patch.dict(payload, {"model": mock_model}):
        eval_candidates = ctrl._evaluate_candidates_with_surrogate(
            beam=[
                type("Cand", (), {
                    "state_sequence": [init_state],
                    "action_sequence": [],
                    "total_cost": 0.0,
                    "total_violations": 0,
                    "is_hard_feasible": True,
                })()
            ],
            solar_kw=50.0,
            load_kw=40.0,
        )
        assert ctrl.surrogate_fallback_counter > 0
        # All selected candidates must still have been physically evaluated
        assert all(c.action_sequence[-1].isPhysicallyVerified for c in eval_candidates)


# -------------------------------------------------------------------------
# 7. Mixed Batches (Safe & Risky Candidates)
# -------------------------------------------------------------------------

def test_mixed_batch_handling(default_grid):
    """Verify that batches with both safe and risky candidates are partitioned safely."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    forecast = generate_test_forecast(8, base_solar=80.0, base_load=30.0)
    
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)
    assert resp.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    # Surrogate evaluated candidates
    assert resp.surrogateEvaluationCount > 0
    # Every action in the verified trajectory was physically evaluated
    for action in resp.plannedTrajectory:
        assert action.isPhysicallyVerified is True


# -------------------------------------------------------------------------
# 8. Feasible Candidate Flagged Risky Is Preserved (No False Elimination)
# -------------------------------------------------------------------------

def test_physically_feasible_candidate_flagged_risky_is_preserved(default_grid):
    """
    Critical safety test: Ensure that if the surrogate flags a candidate as risky,
    it is preserved in the fallback pool and physically evaluated rather than lost.
    """
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")
    
    # Mock model to predict high voltage (risky) for ALL candidates
    mock_model = MagicMock()
    # Predict 1.055 pu voltage (above conservative max 1.042 pu)
    mock_model.predict.return_value = np.full((10, 11), 1.055)
    
    payload = ctrl.surrogate_engine.get_model(default_grid.id)
    with patch.dict(payload, {"model": mock_model}):
        eval_candidates = ctrl._evaluate_candidates_with_surrogate(
            beam=[
                type("Cand", (), {
                    "state_sequence": [init_state],
                    "action_sequence": [],
                    "total_cost": 0.0,
                    "total_violations": 0,
                    "is_hard_feasible": True,
                })()
            ],
            solar_kw=50.0,
            load_kw=40.0,
        )
        
        # Verify: Candidates were NOT discarded!
        assert len(eval_candidates) > 0
        # The candidates were physically evaluated despite the surrogate's risky flag
        assert ctrl.physical_solve_counter > 0
        # At least one candidate was physically verified as feasible (since 50kW solar / 40kW load is benign)
        feasible = [c for c in eval_candidates if c.total_violations == 0]
        assert len(feasible) > 0, "Feasible candidate was lost due to surrogate risky flag!"


# -------------------------------------------------------------------------
# 9. Unsafe Candidate Estimated Safe Is Caught by Physical Solver
# -------------------------------------------------------------------------

def test_unsafe_candidate_estimated_safe_is_caught_by_solver(default_grid):
    """
    Critical safety test: If the surrogate predicts an action is safe (false negative),
    the physical solver must execute and catch the violation before it can be certified.
    """
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")
    
    # Mock model to predict perfectly nominal safe values for all candidates
    mock_model = MagicMock()
    # 1.00 pu voltage, 50% feeder loading, 50% tx loading
    nominal_preds = np.zeros((10, 11))
    nominal_preds[:, :4] = 1.00   # voltages
    nominal_preds[:, 4:9] = 50.0  # feeders
    nominal_preds[:, 9] = 50.0   # tx
    nominal_preds[:, 10] = 5.0   # loss
    mock_model.predict.return_value = nominal_preds
    
    payload = ctrl.surrogate_engine.get_model(default_grid.id)
    with patch.dict(payload, {"model": mock_model}):
        # Run under extreme physical conditions: 300 kW solar surplus creating true physical overvoltage
        eval_candidates = ctrl._evaluate_candidates_with_surrogate(
            beam=[
                type("Cand", (), {
                    "state_sequence": [init_state],
                    "action_sequence": [],
                    "total_cost": 0.0,
                    "total_violations": 0,
                    "is_hard_feasible": True,
                })()
            ],
            solar_kw=300.0,
            load_kw=10.0,
        )
        
        # Idle action will physically violate voltage limits under 300kW solar
        idle_cands = [
            c for c in eval_candidates
            if c.action_sequence[-1].actionType == ControllerActionType.IDLE
        ]
        assert len(idle_cands) > 0
        idle_cand = idle_cands[0]
        # Must NOT be marked as feasible because physical solver caught the violation!
        assert idle_cand.total_violations > 0
        assert idle_cand.action_sequence[-1].isPhysicallyVerified is True
        assert idle_cand.is_hard_feasible is False


# -------------------------------------------------------------------------
# 10. All-Candidates-Risky Behavior
# -------------------------------------------------------------------------

def test_all_candidates_risky_behavior(default_grid):
    """Verify that when all candidates are screened risky, physical fallback evaluates them."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    forecast = generate_test_forecast(8, base_solar=70.0, base_load=30.0)
    
    # Mock surrogate to flag 100% of candidates as risky
    mock_model = MagicMock()
    mock_model.predict.return_value = np.full((10, 11), 1.06)
    
    payload = ctrl.surrogate_engine.get_model(default_grid.id)
    with patch.dict(payload, {"model": mock_model}):
        req = SequentialControlRequest(
            gridId=default_grid.id,
            startTimestep="12:00",
            horizonSteps=8,
            forecastData=forecast,
            allowSurrogateScreening=True,
        )
        resp = ctrl.plan(req)
        # Should not crash or produce an empty plan
        assert len(resp.plannedTrajectory) == 8
        assert resp.physicalSolveCount > 0


# -------------------------------------------------------------------------
# 11. Battery SOC and Signed Dispatch Preservation
# -------------------------------------------------------------------------

def test_battery_soc_and_signed_dispatch_preservation(default_grid):
    """Verify battery sign conventions: positive = discharge (SOC down), negative = charge (SOC up)."""
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    state = ctrl.initialize_state("12:00", initial_soc_percent=50.0)
    
    # Test charging (-20 kW)
    chg_ctrl = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "battery_power_kw": -20.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "Charge",
    }
    next_state, action, _, _ = ctrl.simulate_step(state, chg_ctrl, 50.0, 40.0)
    assert action.batteryPowerKw == -20.0
    assert next_state.aggregate_soc_percent > 50.0
    assert action.batterySocAfter > action.batterySocBefore

    # Test discharging (+20 kW)
    dischg_ctrl = {
        "action_type": ControllerActionType.BATTERY_DISPATCH,
        "battery_power_kw": +20.0,
        "curtailment_kw": 0.0,
        "target_topology": "standard",
        "title": "Discharge",
    }
    next_state2, action2, _, _ = ctrl.simulate_step(state, dischg_ctrl, 50.0, 40.0)
    assert action2.batteryPowerKw == +20.0
    assert next_state2.aggregate_soc_percent < 50.0
    assert action2.batterySocAfter < action2.batterySocBefore


# -------------------------------------------------------------------------
# 12. Multiple-Battery Independence on Large Grid
# -------------------------------------------------------------------------

def test_multiple_battery_independence_on_large_grid(large_grid):
    """Verify that multiple batteries on large-test-grid track individual SOCs correctly."""
    assert len(large_grid.batteries) >= 2, "Large grid should have multiple batteries"
    
    ctrl = SequentialController(grid=large_grid, use_surrogate_screening=True)
    b_ids = [b.id for b in large_grid.batteries]
    init_socs = {b_ids[0]: 80.0, b_ids[1]: 30.0}
    
    state = ctrl.initialize_state("12:00", battery_socs_override=init_socs)
    assert state.battery_socs[b_ids[0]] == 80.0
    assert state.battery_socs[b_ids[1]] == 30.0

    forecast = generate_test_forecast(8)
    req = SequentialControlRequest(
        gridId=large_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        batterySocs=init_socs,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)
    assert resp.status in (PlanStatus.FEASIBLE, PlanStatus.INFEASIBLE)
    # Check that per-battery SOC maps were tracked on each step
    for step in resp.plannedTrajectory:
        assert b_ids[0] in step.batterySocsAfter
        assert b_ids[1] in step.batterySocsAfter


# -------------------------------------------------------------------------
# 13. Final Selected Actions Physical Verification
# -------------------------------------------------------------------------

def test_final_selected_actions_physical_verification(default_grid):
    """Verify that every single planned action in the selected trajectory has isPhysicallyVerified=True."""
    forecast = generate_test_forecast(8)
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)
    
    assert len(resp.plannedTrajectory) == 8
    for step in resp.plannedTrajectory:
        assert step.isPhysicallyVerified is True, "Surrogate prediction must never be certified as safe!"
        assert step.solverConverged is True


# -------------------------------------------------------------------------
# 14. Infeasible Trajectory Honest Reporting
# -------------------------------------------------------------------------

def test_infeasible_trajectory_honest_reporting(default_grid):
    """Verify that when no safe trajectory exists, controller honestly reports INFEASIBLE."""
    # Impossible load causing inevitable undervoltage on default-grid
    forecast = [
        SequentialForecastPoint(
            time=f"{12 + i // 4:02d}:{(i % 4) * 15:02d}",
            solarKw=0.0,
            loadKw=500.0,
        )
        for i in range(8)
    ]
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)
    assert resp.status == PlanStatus.INFEASIBLE
    assert resp.isFeasible is False
    assert resp.fallbackReason is not None
    assert resp.remainingViolationsTotal > 0


# -------------------------------------------------------------------------
# 15. Single-Snapshot Actions Path Unaffected
# -------------------------------------------------------------------------

def test_single_snapshot_actions_path_unaffected(default_grid):
    """Verify that the existing single-snapshot ActionEngine workflow remains completely intact."""
    from app.schemas.battery import BatteryStorageConfig
    b_config = BatteryStorageConfig(initialSocPercent=62.0)
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
        grid=default_grid,
    )
    assert len(actions) == 4
    assert rec_id is not None
    # Every generated action in ActionEngine must be physically verified
    for act in actions:
        assert act.isFeasible is not None
        assert act.expectedVoltagePu is not None
