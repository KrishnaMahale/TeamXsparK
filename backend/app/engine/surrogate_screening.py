"""
Surrogate Screening Engine for Renewable Distribution Grid Digital Twin (ENR-02 Step 3B).

Provides a high-throughput, conservative machine learning screening layer for candidate
action evaluation using the trained per-grid multi-output regression surrogates.

Key Guarantees:
1. Physical PowerFlowEngine.solve() remains authoritative.
2. Surrogate predictions are NEVER marked as physically verified (is_physically_verified=False).
3. Candidate screening uses audited conservative thresholds:
     - Voltage envelope: [0.958, 1.042] pu
     - Feeder loading ceiling: 95.0%
     - Transformer loading ceiling: 95.0%
4. Performance routing: Direct physical solve for small batches (N < 50) where
   the analytical physical solver is faster.
5. Fail-safe fallback: Unsupported grids, missing artifacts, corrupt inputs, or
   non-finite predictions return FALLBACK_REQUIRED without crashing the simulation.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend root
MODELS_DIR = BASE_DIR / "data" / "models"
METADATA_PATH = MODELS_DIR / "surrogate_metadata.json"


class ScreeningStatus(str, Enum):
    SCREENED_CANDIDATE = "SCREENED_CANDIDATE"  # Passed conservative screening
    SCREENED_RISKY = "SCREENED_RISKY"          # Predicted violation of conservative bounds
    FALLBACK_REQUIRED = "FALLBACK_REQUIRED"    # Requires physical solver evaluation


@dataclass
class CandidateScreeningItem:
    candidate_id: str
    status: ScreeningStatus
    rejection_reasons: List[str] = field(default_factory=list)
    predicted_voltages: Optional[Dict[str, float]] = None
    predicted_feeder_loadings: Optional[Dict[str, float]] = None
    predicted_tx_loading: Optional[float] = None
    predicted_losses_kw: Optional[float] = None
    is_physically_verified: bool = False  # NEVER True for surrogate predictions


@dataclass
class BatchScreeningResult:
    grid_id: str
    total_candidates: int
    screened_candidates_count: int
    screened_risky_count: int
    fallback_count: int
    routing_decision: str  # "surrogate_batch" or "direct_physical_solver"
    items: List[CandidateScreeningItem] = field(default_factory=list)
    fallback_reason: Optional[str] = None
    latency_ms: float = 0.0


class SurrogateScreeningEngine:
    """
    Singleton service managing power-flow surrogate loading, validation,
    feature preparation, and conservative candidate screening.
    """

    SUPPORTED_GRIDS = {
        "default-grid": "power_flow_surrogate_default.joblib",
        "medium-test-grid": "power_flow_surrogate_medium.joblib",
        "large-test-grid": "power_flow_surrogate_large.joblib",
    }

    # Conservative screening envelope (safety margin buffer)
    DEFAULT_V_MIN_PU = 0.958
    DEFAULT_V_MAX_PU = 1.042
    DEFAULT_FEEDER_MAX_PCT = 95.0
    DEFAULT_TX_MAX_PCT = 95.0

    # Default batch routing threshold (None = require deliberate caller configuration; direct physical solver by default)
    DEFAULT_BATCH_ROUTING_THRESHOLD: Optional[int] = None

    _instance: Optional[SurrogateScreeningEngine] = None

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = models_dir or MODELS_DIR
        self._models: Dict[str, Any] = {}
        self._payloads: Dict[str, Dict[str, Any]] = {}
        self._metadata: Optional[Dict[str, Any]] = None
        self._load_metadata()

    @classmethod
    def get_instance(cls) -> SurrogateScreeningEngine:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton (useful for test isolation)."""
        cls._instance = None

    def _load_metadata(self) -> None:
        meta_file = self.models_dir / "surrogate_metadata.json"
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load surrogate metadata: {e}")
                self._metadata = None
        else:
            self._metadata = None

    def is_grid_supported(self, grid_id: Optional[str]) -> bool:
        """Verify if grid has a dedicated validated surrogate model."""
        if not grid_id:
            return False
        return grid_id in self.SUPPORTED_GRIDS

    def get_model(self, grid_id: str) -> Optional[Any]:
        """Lazy-load and cache the per-grid surrogate model payload."""
        if not self.is_grid_supported(grid_id):
            return None

        if grid_id in self._payloads:
            return self._payloads[grid_id]

        model_filename = self.SUPPORTED_GRIDS[grid_id]
        model_path = self.models_dir / model_filename

        if not model_path.exists():
            logger.warning(f"Surrogate model artifact missing: {model_path}")
            return None

        try:
            payload = joblib.load(model_path)
            model = payload.get("model")
            if model is not None:
                # Ensure sequential single-process inference (avoids loky multiprocessing overhead)
                setattr(model, "n_jobs", 1)
            self._payloads[grid_id] = payload
            self._models[grid_id] = model
            logger.info(f"Loaded surrogate model for {grid_id} ({model_filename})")
            return payload
        except Exception as e:
            logger.error(f"Failed to load surrogate artifact {model_path}: {e}")
            return None

    def build_feature_row(
        self,
        solar_kw: float,
        load_kw: float,
        battery_power_kw: float,
        solar_curtailment_kw: float,
        is_alternative_topology: bool,
        battery_soc_percent: float,
        installed_solar_capacity_kw: float,
        transformer_rating_kva: float,
    ) -> np.ndarray:
        """
        Builds the exact 10-element feature vector expected by the trained surrogate:
        [solar_kw, load_kw, battery_power_kw, solar_curtailment_kw, net_solar_kw,
         net_imbalance_kw, is_alternative_topology, battery_soc_percent,
         installed_solar_capacity_kw, transformer_rating_kva]
        """
        net_solar = max(0.0, float(solar_kw) - float(solar_curtailment_kw))
        net_imbalance = net_solar + float(battery_power_kw) - float(load_kw)
        alt_topo = 1.0 if is_alternative_topology else 0.0

        return np.array([
            float(solar_kw),
            float(load_kw),
            float(battery_power_kw),
            float(solar_curtailment_kw),
            float(net_solar),
            float(net_imbalance),
            float(alt_topo),
            float(battery_soc_percent),
            float(installed_solar_capacity_kw),
            float(transformer_rating_kva),
        ], dtype=np.float64)

    @classmethod
    def validate_candidate_topology(
        cls,
        candidate_data: Union[Dict[str, Any], Any],
        grid: Optional[Any] = None,
    ) -> Tuple[bool, Optional[float], Optional[str]]:
        """
        Validates whether a candidate's switch configuration matches one of the two
        calibrated topologies supported by the surrogate model:
          - 0.0: Default normal radial topology
          - 1.0: Alternative tie-line closed topology
        
        If the topology is unknown, ambiguous, custom, or unsupported, returns:
          (False, None, error_reason)
        This prevents silently encoding unsupported switch states as default (0.0).
        """
        # Extract topology indicators
        if isinstance(candidate_data, dict):
            target_topology = candidate_data.get("targetTopology")
            is_alt_raw = candidate_data.get("is_alternative_topology")
            feeder_reconfigs = candidate_data.get("feederReconfigurations")
        else:
            target_topology = getattr(candidate_data, "targetTopology", None)
            is_alt_raw = getattr(candidate_data, "is_alternative_topology", None)
            feeder_reconfigs = getattr(candidate_data, "feederReconfigurations", None)

        # 1. Check for conflicting or ambiguous indicators
        if target_topology is not None and is_alt_raw is not None:
            if target_topology == "alternative" and is_alt_raw is False:
                return False, None, "Ambiguous topology: targetTopology='alternative' conflicts with is_alternative_topology=False."
            if str(target_topology).strip().lower() in ("default", "normal", "base", "standard") and is_alt_raw is True:
                return False, None, "Ambiguous topology: targetTopology='default' conflicts with is_alternative_topology=True."

        # 2. Check targetTopology name validity if provided
        alt_val = None
        if target_topology is not None:
            norm_top = str(target_topology).strip().lower()
            if norm_top in ("default", "normal", "base", "standard"):
                alt_val = 0.0
            elif norm_top in ("alternative", "alt", "reconfigured"):
                alt_val = 1.0
            else:
                return (
                    False,
                    None,
                    f"Unsupported topology '{target_topology}'. Surrogate only calibrated for verified default and alternative radial configurations.",
                )

        # 3. Check is_alternative_topology flag if provided
        if is_alt_raw is not None:
            if isinstance(is_alt_raw, bool):
                alt_from_flag = 1.0 if is_alt_raw else 0.0
            elif is_alt_raw in (0, 0.0):
                alt_from_flag = 0.0
            elif is_alt_raw in (1, 1.0):
                alt_from_flag = 1.0
            else:
                return (
                    False,
                    None,
                    f"Invalid or ambiguous is_alternative_topology value: {is_alt_raw!r} (must be bool or 0/1).",
                )
            if alt_val is not None and alt_val != alt_from_flag:
                return False, None, "Conflicting topology flags detected."
            alt_val = alt_from_flag

        # 4. If neither was specified, default to 0.0 only if feederReconfigurations is absent or normal
        if alt_val is None:
            alt_val = 0.0

        # 5. Check feederReconfigurations if present
        if feeder_reconfigs is not None:
            if not isinstance(feeder_reconfigs, dict):
                return False, None, f"Invalid feederReconfigurations format: expected dict, got {type(feeder_reconfigs)}."
            calibrated_tie_feeders = {"F-03", "F-MED-TIE", "F-LRG-TIE-NC", "F-LRG-TIE-CS"}
            for f_id, is_closed in feeder_reconfigs.items():
                if f_id not in calibrated_tie_feeders:
                    # If an arbitrary feeder switch is opened/closed
                    if is_closed is False:
                        return (
                            False,
                            None,
                            f"Custom switch combination with branch '{f_id}' opened is unsupported by surrogate.",
                        )
                    if is_closed is True:
                        return (
                            False,
                            None,
                            f"Custom tie-switch '{f_id}' is unsupported by surrogate.",
                        )

        # 6. Check underlying grid switch state if GridNetwork provided
        if grid is not None and hasattr(grid, "feeders"):
            for f in grid.feeders:
                is_tie = getattr(f, "isReconfigurableAlternate", False) or "TIE" in f.id or f.id == "F-03"
                if not f.isSwitchClosed and not is_tie:
                    return (
                        False,
                        None,
                        f"Underlying grid contains open switch on non-tie feeder '{f.id}', creating an uncalibrated topology.",
                    )

        return True, alt_val, None

    def screen_feature_matrix(
        self,
        grid_id: str,
        X_matrix: np.ndarray,
        candidate_ids: List[str],
        v_min: float = DEFAULT_V_MIN_PU,
        v_max: float = DEFAULT_V_MAX_PU,
        feeder_max: float = DEFAULT_FEEDER_MAX_PCT,
        tx_max: float = DEFAULT_TX_MAX_PCT,
        batch_routing_threshold: Optional[int] = DEFAULT_BATCH_ROUTING_THRESHOLD,
    ) -> BatchScreeningResult:
        """
        Performs vectorized conservative screening across a batch of candidate feature rows.
        """
        t0 = time.perf_counter()
        n_candidates = len(candidate_ids)

        # 1. Routing check: require deliberate threshold configuration
        if batch_routing_threshold is None:
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=["No batch routing threshold configured; direct physical solver required."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason="No batch routing threshold configured; defaulting to safe direct physical evaluation.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        # Small batches are faster with direct physical solver
        if n_candidates < batch_routing_threshold:
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=["Small candidate batch; direct physical solver is faster."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason=f"Candidate batch size {n_candidates} < routing threshold {batch_routing_threshold}.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        # 2. Check grid compatibility
        if not self.is_grid_supported(grid_id):
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[f"Grid '{grid_id}' is unsupported by surrogate models."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason=f"Grid '{grid_id}' unsupported; physical solver required.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        # 3. Load model payload
        payload = self.get_model(grid_id)
        if payload is None:
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[f"Surrogate model artifact for '{grid_id}' is unavailable."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason="Model artifact missing or failed to deserialize.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        model = payload["model"]
        v_targets = payload["voltage_targets"]
        load_targets = payload["loading_targets"]
        target_names = payload["target_names"]

        # 4. Check feature dimensions and finite validity
        if X_matrix.shape != (n_candidates, 10):
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[f"Invalid feature shape: expected ({n_candidates}, 10), got {X_matrix.shape}."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason="Invalid feature matrix dimensions.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        if not np.all(np.isfinite(X_matrix)):
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=["Non-finite (NaN or Inf) feature values detected."],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason="Non-finite feature inputs.",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        # 5. Vectorized inference
        try:
            preds = model.predict(X_matrix)
        except Exception as e:
            logger.error(f"Inference error on {grid_id}: {e}")
            items = [
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[f"Model predict failed: {str(e)}"],
                    is_physically_verified=False,
                )
                for cid in candidate_ids
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason=f"Model inference exception: {e}",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
            )

        v_indices = [target_names.index(c) for c in v_targets]
        f_indices = [target_names.index(c) for c in load_targets]
        tx_idx = target_names.index("tx_loading_percent")
        loss_idx = target_names.index("total_loss_kw")

        items: List[CandidateScreeningItem] = []
        screened_accepted = 0
        screened_risky = 0

        for i, cid in enumerate(candidate_ids):
            pred_v = preds[i, v_indices]
            pred_f = preds[i, f_indices]
            pred_tx = float(preds[i, tx_idx])
            pred_loss = float(preds[i, loss_idx])

            reasons = []

            # Check conservative voltage envelope
            for b_idx, bus_col in enumerate(v_targets):
                val_v = float(pred_v[b_idx])
                if val_v > v_max:
                    reasons.append(f"Predicted overvoltage on {bus_col}: {val_v:.4f} pu > {v_max:.4f} pu")
                elif val_v < v_min:
                    reasons.append(f"Predicted undervoltage on {bus_col}: {val_v:.4f} pu < {v_min:.4f} pu")

            # Check conservative feeder loading envelope
            for f_idx, feed_col in enumerate(load_targets):
                val_f = float(pred_f[f_idx])
                if val_f > feeder_max:
                    reasons.append(f"Predicted feeder overload on {feed_col}: {val_f:.1f}% > {feeder_max:.1f}%")

            # Check conservative transformer loading envelope
            if pred_tx > tx_max:
                reasons.append(f"Predicted transformer overload: {pred_tx:.1f}% > {tx_max:.1f}%")

            is_safe_candidate = len(reasons) == 0
            status = ScreeningStatus.SCREENED_CANDIDATE if is_safe_candidate else ScreeningStatus.SCREENED_RISKY

            if is_safe_candidate:
                screened_accepted += 1
            else:
                screened_risky += 1

            v_dict = {v_targets[j]: round(float(pred_v[j]), 4) for j in range(len(v_targets))}
            f_dict = {load_targets[j]: round(float(pred_f[j]), 1) for j in range(len(load_targets))}

            items.append(
                CandidateScreeningItem(
                    candidate_id=cid,
                    status=status,
                    rejection_reasons=reasons,
                    predicted_voltages=v_dict,
                    predicted_feeder_loadings=f_dict,
                    predicted_tx_loading=round(pred_tx, 1),
                    predicted_losses_kw=round(pred_loss, 2),
                    is_physically_verified=False,  # Explicitly unverified until physical solve
                )
            )

        latency_ms = (time.perf_counter() - t0) * 1000.0

        return BatchScreeningResult(
            grid_id=grid_id,
            total_candidates=n_candidates,
            screened_candidates_count=screened_accepted,
            screened_risky_count=screened_risky,
            fallback_count=0,
            routing_decision="surrogate_batch",
            items=items,
            fallback_reason=None,
            latency_ms=latency_ms,
        )

    def screen_candidates(
        self,
        grid: Any,
        candidates_data: List[Dict[str, Any]],
        base_solar_kw: float,
        base_load_kw: float,
        installed_capacity_kw: float,
        v_min: float = DEFAULT_V_MIN_PU,
        v_max: float = DEFAULT_V_MAX_PU,
        feeder_max: float = DEFAULT_FEEDER_MAX_PCT,
        tx_max: float = DEFAULT_TX_MAX_PCT,
        batch_routing_threshold: Optional[int] = DEFAULT_BATCH_ROUTING_THRESHOLD,
    ) -> BatchScreeningResult:
        """
        Convenience API to screen candidate action parameter dictionaries.
        Validates topology for every candidate, ensuring unsupported switch states
        are never silently encoded as default (0.0).
        """
        grid_id = getattr(grid, "id", str(grid))
        tx_rating = float(getattr(getattr(grid, "substation", None), "ratingKva", 500.0))

        n_candidates = len(candidates_data)
        if n_candidates == 0:
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=0,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=0,
                routing_decision="direct_physical_solver",
                items=[],
            )

        # 1. Routing check: require deliberate threshold configuration
        if batch_routing_threshold is None:
            items = [
                CandidateScreeningItem(
                    candidate_id=c.get("id", f"cand_{i}"),
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=["No batch routing threshold configured; direct physical solver required."],
                    is_physically_verified=False,
                )
                for i, c in enumerate(candidates_data)
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason="No batch routing threshold configured; defaulting to safe direct physical evaluation.",
            )

        if n_candidates < batch_routing_threshold:
            items = [
                CandidateScreeningItem(
                    candidate_id=c.get("id", f"cand_{i}"),
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=["Small candidate batch; direct physical solver is faster."],
                    is_physically_verified=False,
                )
                for i, c in enumerate(candidates_data)
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason=f"Candidate batch size {n_candidates} < routing threshold {batch_routing_threshold}.",
            )

        # 2. Check grid compatibility
        if not self.is_grid_supported(grid_id):
            items = [
                CandidateScreeningItem(
                    candidate_id=c.get("id", f"cand_{i}"),
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[f"Grid '{grid_id}' is unsupported by surrogate models."],
                    is_physically_verified=False,
                )
                for i, c in enumerate(candidates_data)
            ]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=items,
                fallback_reason=f"Grid '{grid_id}' unsupported; physical solver required.",
            )

        # 3. Validate topology and separate valid vs unsupported candidates
        valid_rows = []
        valid_cids = []
        items_map: Dict[str, CandidateScreeningItem] = {}

        for i, c in enumerate(candidates_data):
            cid = c.get("id", f"cand_{i}")
            is_valid_topo, alt_val, topo_err = self.validate_candidate_topology(c, grid)

            if not is_valid_topo:
                # Unsupported or ambiguous topology: MUST NOT reach surrogate inference
                items_map[cid] = CandidateScreeningItem(
                    candidate_id=cid,
                    status=ScreeningStatus.FALLBACK_REQUIRED,
                    rejection_reasons=[topo_err or "Unsupported topology."],
                    is_physically_verified=False,
                )
            else:
                disp_kw = float(c.get("dispatch_kw", c.get("dispatchKw", 0.0)))
                curt_kw = float(c.get("curtailment_kw", c.get("curtailmentKw", 0.0)))
                soc = float(c.get("battery_soc_percent", c.get("batterySocPercent", 50.0)))
                is_alt = bool(alt_val == 1.0)

                row = self.build_feature_row(
                    solar_kw=base_solar_kw,
                    load_kw=base_load_kw,
                    battery_power_kw=disp_kw,
                    solar_curtailment_kw=curt_kw,
                    is_alternative_topology=is_alt,
                    battery_soc_percent=soc,
                    installed_solar_capacity_kw=installed_capacity_kw,
                    transformer_rating_kva=tx_rating,
                )
                valid_rows.append(row)
                valid_cids.append(cid)

        # If zero candidates have supported topology, route all to physical solver
        if not valid_rows:
            all_items = [items_map[c.get("id", f"cand_{i}")] for i, c in enumerate(candidates_data)]
            return BatchScreeningResult(
                grid_id=grid_id,
                total_candidates=n_candidates,
                screened_candidates_count=0,
                screened_risky_count=0,
                fallback_count=n_candidates,
                routing_decision="direct_physical_solver",
                items=all_items,
                fallback_reason="All candidates contained unsupported or ambiguous topology configurations; physical solver required.",
            )

        # Perform vectorized inference only on valid candidates
        X_mat = np.vstack(valid_rows)
        valid_res = self.screen_feature_matrix(
            grid_id=grid_id,
            X_matrix=X_mat,
            candidate_ids=valid_cids,
            v_min=v_min,
            v_max=v_max,
            feeder_max=feeder_max,
            tx_max=tx_max,
            batch_routing_threshold=batch_routing_threshold,
        )

        for item in valid_res.items:
            items_map[item.candidate_id] = item

        # Assemble final ordered items list matching original candidate order
        final_items = [items_map[c.get("id", f"cand_{i}")] for i, c in enumerate(candidates_data)]
        fallback_cnt = sum(1 for it in final_items if it.status == ScreeningStatus.FALLBACK_REQUIRED)
        screened_accepted = sum(1 for it in final_items if it.status == ScreeningStatus.SCREENED_CANDIDATE)
        screened_risky = sum(1 for it in final_items if it.status == ScreeningStatus.SCREENED_RISKY)

        return BatchScreeningResult(
            grid_id=grid_id,
            total_candidates=n_candidates,
            screened_candidates_count=screened_accepted,
            screened_risky_count=screened_risky,
            fallback_count=fallback_cnt,
            routing_decision=valid_res.routing_decision,
            items=final_items,
            fallback_reason=valid_res.fallback_reason,
            latency_ms=valid_res.latency_ms,
        )

