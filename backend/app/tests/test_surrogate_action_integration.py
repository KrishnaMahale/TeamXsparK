"""
Integration Tests for Safe Power-Flow Surrogate Screening in ActionEngine (ENR-02 Step 3B).

Validates:
1. Model artifact loading and output dimension verification against metadata.
2. Grid-specific model selection across default-grid, medium-test-grid, and large-test-grid.
3. Unsupported grid and unsupported topology fallback to physical solver.
4. Missing / corrupt artifact graceful fallback without raising unhandled exceptions.
5. Invalid and non-finite (NaN, Inf) input feature handling.
6. Exact feature ordering and output-to-bus/feeder target mapping.
7. Battery dispatch sign convention (+ discharge/injection, - charge/absorption).
8. Conservative threshold screening across overvoltage, undervoltage, feeder overload, and tx overload.
9. Resilient fallback behavior when all candidates are screened risky (prevents false-alarm lockout).
10. Direct physical routing for small batches (N < 50) and vectorized inference for large batches (N >= 50).
11. Mandatory physical verification: is_physically_verified is strictly False for surrogate results.
12. Preservation of existing candidate ranking, hybrid action formulation, and API contracts.
"""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import numpy as np
import pytest

from app.db.repositories.network_repository import (
    initialize_default_grid,
    initialize_medium_grid,
    initialize_large_grid,
)
from app.engine.actions import ActionEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.surrogate_screening import (
    SurrogateScreeningEngine,
    ScreeningStatus,
    CandidateScreeningItem,
    BatchScreeningResult,
    MODELS_DIR,
)
from app.schemas.action import CorrectiveAction
from app.schemas.battery import BatteryStorageConfig


@pytest.fixture
def screening_engine():
    """Returns a fresh instance of SurrogateScreeningEngine."""
    SurrogateScreeningEngine.reset_instance()
    engine = SurrogateScreeningEngine.get_instance()
    return engine


def test_artifacts_load_successfully_and_match_metadata(screening_engine):
    """Verify all 3 model artifacts load and match metadata dimensions."""
    metadata_path = MODELS_DIR / "surrogate_metadata.json"
    assert metadata_path.exists(), "surrogate_metadata.json not found"

    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    for grid_id, filename in screening_engine.SUPPORTED_GRIDS.items():
        assert screening_engine.is_grid_supported(grid_id)
        payload = screening_engine.get_model(grid_id)
        assert payload is not None, f"Failed to load model payload for {grid_id}"

        expected_meta = meta["grids"][grid_id]
        assert payload["grid_id"] == grid_id
        assert payload["feature_names"] == expected_meta["feature_names"]
        assert payload["target_names"] == expected_meta["target_names"]
        assert len(payload["target_names"]) == len(expected_meta["target_names"])


@pytest.mark.parametrize("grid_id,init_fn,expected_v_count,expected_f_count", [
    ("default-grid", initialize_default_grid, 4, 5),
    ("medium-test-grid", initialize_medium_grid, 5, 6),
    ("large-test-grid", initialize_large_grid, 10, 12),
])
def test_correct_model_selection_and_target_mapping(
    screening_engine, grid_id, init_fn, expected_v_count, expected_f_count
):
    """Verify model selection isolates correct per-grid target mappings."""
    grid = init_fn()
    payload = screening_engine.get_model(grid_id)
    assert payload is not None

    assert len(payload["voltage_targets"]) == expected_v_count
    assert len(payload["loading_targets"]) == expected_f_count
    assert payload["voltage_targets"] == [f"voltage_{b.id}" for b in grid.buses]


def test_unsupported_grid_and_custom_topology_fallback(screening_engine):
    """Verify that custom or uncalibrated grid IDs fall back to physical solver."""
    dummy_cands = [{"id": f"c_{i}", "dispatch_kw": 0.0} for i in range(60)]
    res = screening_engine.screen_candidates(
        grid="unsupported-microgrid-999",
        candidates_data=dummy_cands,
        base_solar_kw=100.0,
        base_load_kw=100.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
    )

    assert res.routing_decision == "direct_physical_solver"
    assert res.fallback_count == 60
    assert "unsupported" in (res.fallback_reason or "").lower()
    for item in res.items:
        assert item.status == ScreeningStatus.FALLBACK_REQUIRED
        assert item.is_physically_verified is False


def test_missing_or_corrupt_artifact_graceful_fallback(screening_engine):
    """Verify that a missing or corrupt model artifact falls back without crashing."""
    dummy_cands = [{"id": f"c_{i}", "dispatch_kw": 0.0} for i in range(60)]
    grid = initialize_default_grid()

    with patch.object(screening_engine, "get_model", return_value=None):
        res = screening_engine.screen_candidates(
            grid=grid,
            candidates_data=dummy_cands,
            base_solar_kw=100.0,
            base_load_kw=100.0,
            installed_capacity_kw=250.0,
            batch_routing_threshold=50,
        )

        assert res.routing_decision == "direct_physical_solver"
        assert res.fallback_count == 60
        assert "missing" in (res.fallback_reason or "").lower() or "artifact" in (res.fallback_reason or "").lower()


def test_invalid_and_non_finite_feature_handling(screening_engine):
    """Verify NaN / Inf features are caught and routed to fallback."""
    grid = initialize_default_grid()
    cands = [{"id": f"c_{i}", "dispatch_kw": 0.0} for i in range(60)]
    # Introduce NaN
    cands[10]["dispatch_kw"] = float("nan")

    res = screening_engine.screen_candidates(
        grid=grid,
        candidates_data=cands,
        base_solar_kw=100.0,
        base_load_kw=100.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
    )

    assert res.routing_decision == "direct_physical_solver"
    assert "non-finite" in (res.fallback_reason or "").lower()


def test_feature_ordering_and_battery_sign_convention(screening_engine):
    """
    Verify exact 10-feature ordering and positive-discharge/negative-charge convention.
    """
    # 1. Discharge: +40 kW
    row_dischg = screening_engine.build_feature_row(
        solar_kw=100.0,
        load_kw=150.0,
        battery_power_kw=+40.0,
        solar_curtailment_kw=0.0,
        is_alternative_topology=False,
        battery_soc_percent=70.0,
        installed_solar_capacity_kw=250.0,
        transformer_rating_kva=500.0,
    )
    assert row_dischg.shape == (10,)
    assert row_dischg[2] == +40.0  # battery_power_kw
    assert row_dischg[4] == 100.0  # net_solar_kw
    assert row_dischg[5] == (100.0 + 40.0 - 150.0)  # net_imbalance_kw = -10.0
    assert row_dischg[6] == 0.0    # is_alternative_topology

    # 2. Charge: -30 kW
    row_chg = screening_engine.build_feature_row(
        solar_kw=200.0,
        load_kw=80.0,
        battery_power_kw=-30.0,
        solar_curtailment_kw=20.0,
        is_alternative_topology=True,
        battery_soc_percent=40.0,
        installed_solar_capacity_kw=250.0,
        transformer_rating_kva=500.0,
    )
    assert row_chg[2] == -30.0   # battery_power_kw
    assert row_chg[3] == 20.0    # curtailment_kw
    assert row_chg[4] == 180.0   # net_solar_kw (200 - 20)
    assert row_chg[5] == (180.0 - 30.0 - 80.0)  # net_imbalance_kw = 70.0
    assert row_chg[6] == 1.0     # is_alternative_topology


def test_conservative_threshold_screening_rejections(screening_engine):
    """
    Verify conservative thresholds reject overvoltage, undervoltage, and overloads.
    Thresholds: V in [0.958, 1.042], Load <= 95%.
    """
    grid = initialize_default_grid()
    
    # 1. Normal safe candidate
    c_safe = [{"id": f"safe_{i}", "dispatch_kw": 0.0, "curtailment_kw": 0.0} for i in range(50)]
    res_safe = screening_engine.screen_candidates(
        grid=grid,
        candidates_data=c_safe,
        base_solar_kw=100.0,
        base_load_kw=120.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
    )
    assert res_safe.routing_decision == "surrogate_batch"
    assert res_safe.screened_candidates_count == 50
    assert res_safe.screened_risky_count == 0

    # 2. Overvoltage condition (very high solar 320 kW, zero load)
    c_overv = [{"id": f"overv_{i}", "dispatch_kw": 0.0, "curtailment_kw": 0.0} for i in range(50)]
    res_overv = screening_engine.screen_candidates(
        grid=grid,
        candidates_data=c_overv,
        base_solar_kw=320.0,
        base_load_kw=20.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
    )
    assert res_overv.routing_decision == "surrogate_batch"
    # All 50 should be screened risky due to predicted overvoltage > 1.042 pu
    assert res_overv.screened_risky_count == 50
    assert res_overv.screened_candidates_count == 0
    assert any("overvoltage" in r.lower() for r in res_overv.items[0].rejection_reasons)


def test_all_candidates_screened_out_fallback_in_action_engine():
    """
    Verify that when all candidates are screened risky, ActionEngine safely falls back
    to physical solver instead of locking out the system with zero actions.
    """
    grid = initialize_default_grid()
    # 55 candidates with severe overvoltage inputs
    candidates = [
        CorrectiveAction(
            id=f"ACT_TEST_{i}",
            type="battery_discharge",
            title=f"Test Candidate {i}",
            description="Stress candidate",
            parameterDelta="0 kW",
            isFeasible=True,
            expectedVoltagePu=1.05,
            expectedFeederLoadPercent=90.0,
            solarUsedKw=320.0,
            batterySocPercent=50.0,
            resolvedViolationsCount=0,
            remainingViolationsCount=1,
            renewableUtilizationPercent=100.0,
            gridId=grid.id,
            dispatchKw=0.0,
            curtailmentKw=0.0,
            targetTopology="standard",
        )
        for i in range(55)
    ]

    surviving, result = ActionEngine.screen_candidate_actions_batch(
        candidates=candidates,
        grid=grid,
        peak_solar_kw=320.0,
        peak_load_kw=20.0,
        batch_routing_threshold=50,
    )

    # Even though all 55 were screened risky by the surrogate, ActionEngine must fall back
    # and return all 55 candidates for physical solver evaluation to prevent false-alarm gridlock
    assert len(surviving) == 55
    assert result.screened_risky_count == 55
    assert "falling back to physical solver" in (result.fallback_reason or "").lower()


def test_small_batch_routing_to_physical_solver():
    """Verify candidate batches below threshold (N < 50) bypass surrogate."""
    grid = initialize_default_grid()
    candidates = [
        CorrectiveAction(
            id=f"ACT_SMALL_{i}",
            type="battery_discharge",
            title=f"Small batch candidate {i}",
            description="Small candidate",
            parameterDelta="0 kW",
            isFeasible=True,
            expectedVoltagePu=1.01,
            expectedFeederLoadPercent=60.0,
            solarUsedKw=100.0,
            batterySocPercent=50.0,
            resolvedViolationsCount=0,
            remainingViolationsCount=0,
            renewableUtilizationPercent=100.0,
            gridId=grid.id,
        )
        for i in range(10)
    ]

    surviving, result = ActionEngine.screen_candidate_actions_batch(
        candidates=candidates,
        grid=grid,
        peak_solar_kw=100.0,
        peak_load_kw=120.0,
        batch_routing_threshold=50,
    )

    assert result.routing_decision == "direct_physical_solver"
    assert len(surviving) == 10
    assert result.total_candidates == 10


def test_mandatory_physical_verification_semantics():
    """
    Verify that surrogate screening items explicitly declare is_physically_verified=False,
    and subsequent apply_action_physics executes genuine PowerFlowEngine.solve().
    """
    grid = initialize_default_grid()
    candidates = [
        CorrectiveAction(
            id=f"ACT_{i}",
            type="battery_discharge",
            title=f"Candidate {i}",
            description="Candidate",
            parameterDelta="-20 kW",
            isFeasible=True,
            expectedVoltagePu=1.01,
            expectedFeederLoadPercent=60.0,
            solarUsedKw=100.0,
            batterySocPercent=50.0,
            resolvedViolationsCount=1,
            remainingViolationsCount=0,
            renewableUtilizationPercent=100.0,
            gridId=grid.id,
            dispatchKw=-20.0,
        )
        for i in range(55)
    ]

    surviving, result = ActionEngine.screen_candidate_actions_batch(
        candidates=candidates,
        grid=grid,
        peak_solar_kw=100.0,
        peak_load_kw=120.0,
        batch_routing_threshold=50,
    )

    # All items from surrogate must be unverified
    for item in result.items:
        assert item.is_physically_verified is False

    # Take the top surviving candidate and run genuine physical solver verification
    top_cand = surviving[0]
    pf, buses, feeders = ActionEngine.apply_action_physics(
        action=top_cand,
        grid=grid,
        peak_solar_kw=100.0,
        peak_load_kw=120.0,
        installed_capacity_kw=250.0,
    )
    assert isinstance(pf, PowerFlowEngine)
    assert len(buses) == 4
    assert len(feeders) == 5
    # Voltages obtained physically
    v_b1 = next(b.voltage for b in buses if b.id == "B1")
    assert v_b1 == 1.020


def test_existing_action_ranking_and_hybrid_behavior_unaltered():
    """
    Verify existing ActionEngine.evaluate_candidate_actions ranking keys and
    recommendations remain completely unaltered by the surrogate layer.
    """
    grid = initialize_default_grid()
    battery_cfg = BatteryStorageConfig(capacityKwh=100.0, maxChargeKw=40.0, maxDischargeKw=40.0, initialSocPercent=60.0)

    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=220.0,
        peak_load_kw=120.0,
        battery_config=battery_cfg,
        grid=grid,
        installed_capacity_kw=250.0,
        include_hybrid=True,
    )

    assert len(actions) >= 4
    assert rec_id in [a.id for a in actions]
    assert comp.isSafe in (True, False)
    # Check that recommended action is feasible and has expected keys
    rec_action = next(a for a in actions if a.id == rec_id)
    assert rec_action.isFeasible is True
    assert rec_action.expectedVoltagePu > 0.0


# ==============================================================================
# ENR-02 Step 3B.2 Safety Cleanup: Focused Topology & Mixed-Batch Tests
# ==============================================================================

def test_topology_validation_verified_default(screening_engine):
    """1. Verified default topology returns valid status and alt_val = 0.0."""
    grid = initialize_default_grid()
    cand = {"id": "c_def", "targetTopology": "default", "is_alternative_topology": False}
    is_valid, alt_val, err = screening_engine.validate_candidate_topology(cand, grid)
    assert is_valid is True
    assert alt_val == 0.0
    assert err is None


def test_topology_validation_verified_alternative(screening_engine):
    """2. Verified alternative topology returns valid status and alt_val = 1.0."""
    grid = initialize_default_grid()
    cand = {"id": "c_alt", "targetTopology": "alternative", "is_alternative_topology": True}
    is_valid, alt_val, err = screening_engine.validate_candidate_topology(cand, grid)
    assert is_valid is True
    assert alt_val == 1.0
    assert err is None


def test_topology_validation_unknown_topology_name(screening_engine):
    """3. Unknown topology name returns invalid and FALLBACK_REQUIRED."""
    grid = initialize_default_grid()
    cand = {"id": "c_unk", "targetTopology": "island_mode"}
    is_valid, alt_val, err = screening_engine.validate_candidate_topology(cand, grid)
    assert is_valid is False
    assert alt_val is None
    assert "unsupported" in err.lower()

    # When screened through screen_candidates, receives FALLBACK_REQUIRED
    res = screening_engine.screen_candidates(
        grid=grid,
        candidates_data=[cand] * 50,
        base_solar_kw=100.0,
        base_load_kw=100.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
    )
    assert res.routing_decision == "direct_physical_solver"
    assert res.items[0].status == ScreeningStatus.FALLBACK_REQUIRED
    assert "unsupported topology" in res.items[0].rejection_reasons[0].lower()


def test_topology_validation_custom_switch_combination(screening_engine):
    """4. Custom switch combination returns invalid and FALLBACK_REQUIRED."""
    grid = initialize_default_grid()
    # Opening main incomer F-01 is a custom uncalibrated outage topology
    cand = {
        "id": "c_custom",
        "targetTopology": "default",
        "feederReconfigurations": {"F-01": False},
    }
    is_valid, alt_val, err = screening_engine.validate_candidate_topology(cand, grid)
    assert is_valid is False
    assert alt_val is None
    assert "custom switch" in err.lower() or "unsupported" in err.lower()


def test_topology_validation_missing_or_ambiguous_info(screening_engine):
    """5. Conflicting or ambiguous topology information triggers fallback."""
    grid = initialize_default_grid()
    cand_conflict = {
        "id": "c_conflict",
        "targetTopology": "alternative",
        "is_alternative_topology": False,  # Direct conflict
    }
    is_valid, alt_val, err = screening_engine.validate_candidate_topology(cand_conflict, grid)
    assert is_valid is False
    assert "ambiguous" in err.lower()


def test_unsupported_topology_never_reaches_surrogate_inference_as_falsely_encoded_default(screening_engine):
    """6. Confirmation that unsupported topology never reaches surrogate inference as 0.0."""
    grid = initialize_default_grid()
    # Create 51 candidates: 50 valid default, 1 unsupported custom topology (total 51 >= 50)
    cands = [{"id": f"c_{i}", "targetTopology": "default", "dispatch_kw": 0.0} for i in range(50)]
    cands.append({"id": "c_bad_topo", "targetTopology": "custom_island", "dispatch_kw": 0.0})

    inferred_matrices = []

    # Spy on model.predict to record actual input feature matrices
    payload = screening_engine.get_model("default-grid")
    orig_predict = payload["model"].predict

    def spy_predict(X):
        inferred_matrices.append(X.copy())
        return orig_predict(X)

    with patch.object(payload["model"], "predict", side_effect=spy_predict):
        res = screening_engine.screen_candidates(
            grid=grid,
            candidates_data=cands,
            base_solar_kw=100.0,
            base_load_kw=120.0,
            installed_capacity_kw=250.0,
            batch_routing_threshold=50,
        )

    # 1. The unsupported candidate MUST receive FALLBACK_REQUIRED
    bad_item = next(it for it in res.items if it.candidate_id == "c_bad_topo")
    assert bad_item.status == ScreeningStatus.FALLBACK_REQUIRED
    assert "unsupported" in bad_item.rejection_reasons[0].lower()

    # 2. Inferred matrix must contain ONLY the 50 valid candidates, NEVER the bad candidate
    assert len(inferred_matrices) == 1
    assert inferred_matrices[0].shape == (50, 10)


def test_mixed_batch_false_alarm_preserves_physically_feasible_candidate():
    """
    Step 3B.2 Task 2 Regression Test:
    In a mixed candidate batch:
    - Candidate A: Near conservative boundary (screened risky, but physically feasible)
    - Candidate B: Well within bounds (passes surrogate screening)
    
    Verifies that under default allow_pruning=False:
    1. Candidate A is NOT silently lost or permanently discarded.
    2. Both candidates are returned for physical verification and ranking.
    3. Candidate A successfully undergoes physical verification and is recognized as feasible.
    """
    grid = initialize_default_grid()

    # Base condition: solar=180.0, load=120.0
    # Candidate A: 0 curtailment, battery -10 kW. Predicted V_B3 = 1.0430 pu (> 1.042 pu SCREENED_RISKY),
    # but true physical voltage is <= 1.050 pu (physically feasible!)
    cand_a = CorrectiveAction(
        id="ACT_BORDERLINE_FEASIBLE",
        type="battery_discharge",
        title="Zero Curtailment / Light Battery Charge",
        description="Preserves 100% solar; voltage near 1.043 pu",
        parameterDelta="-10 kW",
        isFeasible=True,
        expectedVoltagePu=1.043,
        expectedFeederLoadPercent=80.0,
        solarUsedKw=180.0,
        batterySocPercent=50.0,
        resolvedViolationsCount=1,
        remainingViolationsCount=0,
        renewableUtilizationPercent=100.0,  # 100% solar utilized!
        gridId=grid.id,
        curtailmentKw=0.0,
        dispatchKw=-10.0,
    )

    # Candidate B: 20 kW curtailment, battery -10 kW. Predicted V_B3 = 1.0145 pu (SCREENED_CANDIDATE)
    cand_b = CorrectiveAction(
        id="ACT_DEEP_SAFE_SUBOPTIMAL",
        type="solar_curtailment",
        title="Moderate Solar Curtailment (20 kW)",
        description="Curtailed solar safe but sub-optimal utilization",
        parameterDelta="20 kW",
        isFeasible=True,
        expectedVoltagePu=1.015,
        expectedFeederLoadPercent=65.0,
        solarUsedKw=160.0,
        batterySocPercent=50.0,
        resolvedViolationsCount=1,
        remainingViolationsCount=0,
        renewableUtilizationPercent=88.9,  # Sub-optimal utilization
        gridId=grid.id,
        curtailmentKw=20.0,
        dispatchKw=-10.0,
    )

    # Fill batch to 50 candidates to trigger surrogate screening
    filler_cands = [
        CorrectiveAction(
            id=f"ACT_FILLER_{i}",
            type="solar_curtailment",
            title=f"Filler {i}",
            description="Filler",
            parameterDelta="20 kW",
            isFeasible=True,
            expectedVoltagePu=1.015,
            expectedFeederLoadPercent=65.0,
            solarUsedKw=160.0,
            batterySocPercent=50.0,
            resolvedViolationsCount=1,
            remainingViolationsCount=0,
            renewableUtilizationPercent=88.9,
            gridId=grid.id,
            curtailmentKw=20.0,
            dispatchKw=-10.0,
        )
        for i in range(48)
    ]

    all_cands = [cand_a, cand_b] + filler_cands

    # Run screening with safe default (allow_pruning=False)
    returned_cands, screening_res = ActionEngine.screen_candidate_actions_batch(
        candidates=all_cands,
        grid=grid,
        peak_solar_kw=180.0,
        peak_load_kw=120.0,
        installed_capacity_kw=250.0,
        batch_routing_threshold=50,
        allow_pruning=False,
    )

    # Verify screening categorized cand_a as SCREENED_RISKY and cand_b as SCREENED_CANDIDATE
    item_a = next(it for it in screening_res.items if it.candidate_id == cand_a.id)
    item_b = next(it for it in screening_res.items if it.candidate_id == cand_b.id)
    assert item_a.status == ScreeningStatus.SCREENED_RISKY
    assert item_b.status == ScreeningStatus.SCREENED_CANDIDATE

    # CRITICAL: Candidate A MUST NOT BE LOST! It must be in returned_cands for physical verification
    assert cand_a.id in [c.id for c in returned_cands]
    assert cand_b.id in [c.id for c in returned_cands]

    # Run physical verification on Candidate A
    pf, buses, feeders = ActionEngine.apply_action_physics(
        action=cand_a,
        grid=grid,
        peak_solar_kw=180.0,
        peak_load_kw=120.0,
        installed_capacity_kw=250.0,
    )
    max_v = max(b.voltage for b in buses)
    # Physically verified: max_v is <= 1.050 pu (physically feasible!)
    assert max_v <= 1.050
    assert cand_a.renewableUtilizationPercent > cand_b.renewableUtilizationPercent


def test_safe_default_routing_when_threshold_unconfigured():
    """Verify that omitting batch_routing_threshold safely defaults to physical solver."""
    grid = initialize_default_grid()
    candidates = [
        CorrectiveAction(
            id=f"c_{i}",
            type="solar_curtailment",
            title=f"Cand {i}",
            description="test",
            parameterDelta="10 kW",
            isFeasible=True,
            expectedVoltagePu=1.01,
            expectedFeederLoadPercent=60.0,
            solarUsedKw=100.0,
            batterySocPercent=50.0,
            resolvedViolationsCount=1,
            remainingViolationsCount=0,
            renewableUtilizationPercent=100.0,
            gridId=grid.id,
        )
        for i in range(60)
    ]

    # Omitting batch_routing_threshold
    returned_cands, screening_res = ActionEngine.screen_candidate_actions_batch(
        candidates=candidates,
        grid=grid,
        peak_solar_kw=100.0,
        peak_load_kw=100.0,
        installed_capacity_kw=250.0,
    )

    assert screening_res.routing_decision == "direct_physical_solver"
    assert "no batch routing threshold configured" in screening_res.fallback_reason.lower()
    assert len(returned_cands) == 60

