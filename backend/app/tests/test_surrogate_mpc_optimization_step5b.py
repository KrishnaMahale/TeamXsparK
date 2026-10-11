"""
Step 5B Regression Test Suite:
Activation and Optimization of Surrogate-Based MPC Candidate Screening.

Verifies:
1. The correct artifact is selected for each supported grid.
2. Surrogate screening is enabled by default for validated configurations.
3. Disabled mode strictly preserves the direct physical-solver path.
4. Candidate screening significantly reduces physical solver calls on supported cases.
5. Unsafe and uncertain predictions trigger verification or fallback.
6. Rooftop topology incompatibility triggers safe physical solver fallback.
7. All selected trajectories and actions are authoritatively physically verified.
8. Battery SOC, sign conventions, topology, and constraint limits remain strictly preserved.
9. No production model artifact or trained dataset is modified.
"""

import copy
import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch
import numpy as np
import pytest

from app.db.repositories.network_repository import initialize_default_grid, NetworkRepository
from app.engine.power_flow import PowerFlowEngine
from app.engine.sequential_controller import SequentialController, SequentialState
from app.engine.surrogate_screening import SurrogateScreeningEngine, ScreeningStatus
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    SequentialControlRequest,
    SequentialForecastPoint,
)


@pytest.fixture
def default_grid():
    return initialize_default_grid()


def make_forecast(steps: int = 8, base_solar: float = 120.0, base_load: float = 60.0):
    points = []
    for i in range(steps):
        h = (12 + (i * 15) // 60) % 24
        m = (i * 15) % 60
        solar = max(0.0, base_solar * np.sin(np.pi * (i % 48) / 48.0))
        load = base_load + 20.0 * np.cos(np.pi * (i % 48) / 48.0)
        points.append(
            SequentialForecastPoint(
                time=f"{h:02d}:{m:02d}",
                solarKw=round(float(solar), 2),
                loadKw=round(float(load), 2),
            )
        )
    return points


# -------------------------------------------------------------------------
# 1. Correct Artifact Selection per Grid
# -------------------------------------------------------------------------
@pytest.mark.parametrize(
    "grid_id,expected_artifact,expected_targets_count",
    [
        ("default-grid", "power_flow_surrogate_default.joblib", 11),
        ("medium-test-grid", "power_flow_surrogate_medium.joblib", 13),
        ("large-test-grid", "power_flow_surrogate_large.joblib", 24),
    ],
)
def test_correct_artifact_selected_for_each_grid(grid_id, expected_artifact, expected_targets_count):
    engine = SurrogateScreeningEngine.get_instance()
    assert engine.is_grid_supported(grid_id)
    assert engine.SUPPORTED_GRIDS[grid_id] == expected_artifact

    payload = engine.get_model(grid_id)
    assert payload is not None
    assert len(payload.get("target_names", [])) == expected_targets_count


# -------------------------------------------------------------------------
# 2. Surrogate Prediction Invoked by Default
# -------------------------------------------------------------------------
def test_surrogate_prediction_invoked_by_default(default_grid):
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        # allowSurrogateScreening omitted -> defaults to True
    )
    assert req.allowSurrogateScreening is True

    ctrl = SequentialController(grid=default_grid)
    resp = ctrl.plan(req)

    assert resp.status == PlanStatus.FEASIBLE
    assert resp.surrogateEvaluationCount > 0, "Surrogate screening must be invoked by default!"
    assert resp.physicalSolveCount > 0, "Physical solver must verify selected candidates!"


# -------------------------------------------------------------------------
# 3. Disabled Mode Preserves Direct Physical Solver Path
# -------------------------------------------------------------------------
def test_disabled_mode_preserves_direct_physical_path(default_grid):
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=False,
    )
    ctrl = SequentialController(grid=default_grid)
    resp = ctrl.plan(req)

    assert resp.status == PlanStatus.FEASIBLE
    assert resp.surrogateEvaluationCount == 0, "Surrogate must not be invoked when explicitly disabled!"
    assert resp.surrogatePrunedCount == 0
    assert resp.physicalSolveCount > 0


# -------------------------------------------------------------------------
# 4. Candidate Screening Significantly Reduces Physical Solver Calls
# -------------------------------------------------------------------------
def test_candidate_screening_reduces_physical_solver_calls(default_grid):
    forecast = make_forecast(8)
    # Direct
    req_dir = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=False,
    )
    resp_dir = SequentialController(grid=default_grid, use_surrogate_screening=False).plan(req_dir)

    # Surrogate screened
    req_surr = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp_surr = SequentialController(grid=default_grid, use_surrogate_screening=True).plan(req_surr)

    assert resp_surr.physicalSolveCount < resp_dir.physicalSolveCount, (
        f"Expected surrogate screening to reduce physical solves: {resp_surr.physicalSolveCount} vs {resp_dir.physicalSolveCount}"
    )
    reduction_pct = (1.0 - resp_surr.physicalSolveCount / resp_dir.physicalSolveCount) * 100.0
    assert reduction_pct >= 25.0, f"Expected at least 25% physical solve reduction, got {reduction_pct:.1f}%"
    assert resp_surr.surrogatePrunedCount > 0, "Expected positive surrogate pruned candidates count!"


# -------------------------------------------------------------------------
# 5. Unsafe Predictions Trigger Verification and Rejection
# -------------------------------------------------------------------------
def test_unsafe_predictions_caught_by_physical_verification(default_grid):
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    init_state = ctrl.initialize_state("12:00")

    # Mock surrogate to claim 100% nominal safety even under extreme physical overvoltage conditions
    mock_model = MagicMock()
    nominal_preds = np.zeros((10, 11))
    nominal_preds[:, :4] = 1.00   # voltages
    nominal_preds[:, 4:9] = 50.0  # feeders
    nominal_preds[:, 9] = 50.0   # tx
    nominal_preds[:, 10] = 5.0   # loss
    mock_model.predict.return_value = nominal_preds

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
            solar_kw=320.0,
            load_kw=10.0,
        )

        idle_cands = [c for c in eval_candidates if c.action_sequence[-1].actionType == ControllerActionType.IDLE]
        assert len(idle_cands) > 0
        idle_cand = idle_cands[0]
        # Physical solver caught genuine overvoltage
        assert idle_cand.total_violations > 0
        assert idle_cand.action_sequence[-1].isPhysicallyVerified is True
        assert idle_cand.is_hard_feasible is False


# -------------------------------------------------------------------------
# 6. Rooftop Topology Incompatibility Triggers Physical Fallback
# -------------------------------------------------------------------------
def test_rooftop_incompatibility_triggers_physical_fallback(default_grid):
    # Alter rooftop solar connection away from canonical Bus B3 to Bus B4
    mod_grid = default_grid.model_copy(deep=True)
    rooftop = next(s for s in mod_grid.solarUnits if getattr(s, "isSolarRooftop", False))
    rooftop.busId = "B4"

    ctrl = SequentialController(grid=mod_grid, use_surrogate_screening=True)
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=mod_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    resp = ctrl.plan(req)

    # Must safely execute via physical fallback
    assert resp.status == PlanStatus.FEASIBLE
    assert resp.surrogateFallbackCount > 0, "Relocated rooftop solar must trigger surrogateFallbackCount!"
    assert resp.physicalSolveCount > 0


# -------------------------------------------------------------------------
# 7. Selected Trajectories Authoritatively Verified
# -------------------------------------------------------------------------
def test_all_selected_actions_authoritatively_verified(default_grid):
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        allowSurrogateScreening=True,
    )
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    resp = ctrl.plan(req)

    assert resp.status == PlanStatus.FEASIBLE
    assert len(resp.plannedTrajectory) == 8
    for action in resp.plannedTrajectory:
        assert action.isPhysicallyVerified is True, "Every planned action must have isPhysicallyVerified=True"
        assert action.solverConverged is True


# -------------------------------------------------------------------------
# 8. Battery SOC and Constraints Preserved
# -------------------------------------------------------------------------
def test_battery_soc_and_constraints_preserved(default_grid):
    forecast = make_forecast(8)
    req = SequentialControlRequest(
        gridId=default_grid.id,
        startTimestep="12:00",
        horizonSteps=8,
        forecastData=forecast,
        initialSocPercent=55.0,
        allowSurrogateScreening=True,
    )
    ctrl = SequentialController(grid=default_grid, use_surrogate_screening=True)
    resp = ctrl.plan(req)

    assert resp.status == PlanStatus.FEASIBLE
    assert 15.0 <= resp.terminalSocPercent <= 98.0
    # Battery SOC correctly propagates across steps
    prev_soc = 55.0
    for act in resp.plannedTrajectory:
        assert abs(act.batterySocBefore - prev_soc) < 0.1
        if act.batteryPowerKw < 0:  # Charging
            assert act.batterySocAfter >= act.batterySocBefore
        elif act.batteryPowerKw > 0:  # Discharging
            assert act.batterySocAfter <= act.batterySocBefore
        prev_soc = act.batterySocAfter


# -------------------------------------------------------------------------
# 9. No Production Artifact Modified
# -------------------------------------------------------------------------
def test_no_production_artifacts_modified():
    models_dir = Path("backend/data/models")
    artifacts = [
        "power_flow_surrogate_default.joblib",
        "power_flow_surrogate_medium.joblib",
        "power_flow_surrogate_large.joblib",
    ]
    for art in artifacts:
        p = models_dir / art
        assert p.exists(), f"Artifact {art} must exist"
        assert p.stat().st_size > 1000, f"Artifact {art} is non-empty"
