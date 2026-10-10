"""
Sequential Multi-Step Controller Engine for Renewable Distribution Grid Digital Twin.
Implements bounded Receding-Horizon Model Predictive Control (MPC) across H >= 8 timesteps
with stateful battery SOC propagation, network limit enforcement, and authoritative physical verification.
"""

from __future__ import annotations

import copy
import math
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.core.logging import logger
from app.engine.battery import BatteryEngine
from app.engine.constraints import ConstraintChecker
from app.engine.power_flow import PowerFlowEngine
from app.engine.surrogate_screening import SurrogateScreeningEngine, ScreeningStatus
from app.schemas.battery import BatteryStorageConfig
from app.schemas.network import GridNetwork
from app.schemas.sequential_control import (
    ControllerActionType,
    PlanStatus,
    PlannedStepAction,
    SequentialControlRequest,
    SequentialControlResponse,
    SequentialForecastPoint,
)
from app.schemas.simulation import NetworkLimitsConfig


from types import MappingProxyType


@dataclass(frozen=True)
class SequentialState:
    """
    Immutable state representation for sequential trajectory optimization.
    Defensively copied between candidate evaluations to prevent state leakage.
    """
    step_index: int
    time: str
    battery_socs: Any  # MappingProxyType[str, float]
    topology_state: str  # "standard" or "alternative"
    cumulative_curtailment_kwh: float = 0.0
    cumulative_loss_kwh: float = 0.0
    switch_count: int = 0
    last_battery_power_kw: float = 0.0

    def __init__(
        self,
        step_index: int,
        time: str,
        battery_socs: Dict[str, float],
        topology_state: str,
        cumulative_curtailment_kwh: float = 0.0,
        cumulative_loss_kwh: float = 0.0,
        switch_count: int = 0,
        last_battery_power_kw: float = 0.0,
    ):
        object.__setattr__(self, "step_index", int(step_index))
        object.__setattr__(self, "time", str(time))
        object.__setattr__(self, "battery_socs", MappingProxyType(dict(battery_socs)))
        object.__setattr__(self, "topology_state", str(topology_state))
        object.__setattr__(self, "cumulative_curtailment_kwh", float(cumulative_curtailment_kwh))
        object.__setattr__(self, "cumulative_loss_kwh", float(cumulative_loss_kwh))
        object.__setattr__(self, "switch_count", int(switch_count))
        object.__setattr__(self, "last_battery_power_kw", float(last_battery_power_kw))

    @property
    def aggregate_soc_percent(self) -> float:
        """Returns mean battery SOC across all installed batteries."""
        if not self.battery_socs:
            return 50.0
        return sum(self.battery_socs.values()) / len(self.battery_socs)


@dataclass
class TrajectoryCandidate:
    """Candidate action trajectory evaluated during receding-horizon search."""
    state_sequence: List[SequentialState]
    action_sequence: List[PlannedStepAction]
    total_cost: float
    total_violations: int
    is_hard_feasible: bool


class SequentialController:
    """
    Receding-Horizon Model Predictive Controller for multi-step distribution grid management.
    Evaluates candidate action trajectories over H >= 8 timesteps (15-minute resolution).
    """

    def __init__(
        self,
        grid: GridNetwork,
        step_duration_hours: float = 0.25,
        beam_width: int = 4,
        use_surrogate_screening: bool = False,
        surrogate_screening_engine: Optional[SurrogateScreeningEngine] = None,
    ):
        self.grid = grid
        self.step_duration_hours = max(0.01, float(step_duration_hours))
        self.beam_width = max(1, int(beam_width))
        self.limits = NetworkLimitsConfig()
        self.use_surrogate_screening = bool(use_surrogate_screening)
        self.surrogate_engine = surrogate_screening_engine or SurrogateScreeningEngine.get_instance()

        # Cache battery asset specifications
        self.batteries = list(grid.batteries) if grid.batteries else []
        self.total_battery_cap_kwh = sum(b.capacityKwh for b in self.batteries)
        self.total_max_chg_kw = sum(b.maxChargeKw for b in self.batteries)
        self.total_max_dischg_kw = sum(b.maxDischargeKw for b in self.batteries)

        # Check alternative topology capability
        self.supports_alternative_topology = any(
            getattr(f, "isReconfigurableAlternate", False) for f in grid.feeders
        )

        # Internal physical solvers (isolated instances)
        self.pf_standard = PowerFlowEngine(is_alternative_topology=False)
        self.pf_alternative = PowerFlowEngine(is_alternative_topology=True)
        self.physical_solve_counter = 0
        self.surrogate_eval_counter = 0
        self.surrogate_fallback_counter = 0
        self.surrogate_pruned_counter = 0

    def validate_forecast_series(
        self,
        forecast_points: List[SequentialForecastPoint],
        start_time: str,
        horizon_steps: int,
    ) -> List[SequentialForecastPoint]:
        """
        Validates forecast completeness, chronological ordering, and 15-minute spacing.
        Extracts exactly horizon_steps points beginning at start_time.
        """
        if not forecast_points:
            raise ValueError("Forecast time-series cannot be empty.")

        if horizon_steps < 8:
            raise ValueError(f"Planning horizon must be at least 8 timesteps (got {horizon_steps}).")

        # Find start index
        start_idx = None
        for idx, pt in enumerate(forecast_points):
            if pt.time == start_time:
                start_idx = idx
                break

        if start_idx is None:
            raise ValueError(f"Start timestep '{start_time}' not found in provided forecast points.")

        window = forecast_points[start_idx : start_idx + horizon_steps]
        if len(window) < horizon_steps:
            raise ValueError(
                f"Insufficient forecast points from '{start_time}': requested {horizon_steps} steps, "
                f"but only {len(window)} points remain in series."
            )

        # Validate 15-minute chronological spacing
        for i in range(1, len(window)):
            t_prev = window[i - 1].time
            t_curr = window[i].time
            try:
                h_prev, m_prev = map(int, t_prev.split(":"))
                h_curr, m_curr = map(int, t_curr.split(":"))
                mins_prev = h_prev * 60 + m_prev
                mins_curr = h_curr * 60 + m_curr
                delta_mins = (mins_curr - mins_prev) % 1440
                if delta_mins != 15:
                    raise ValueError(
                        f"Forecast points are not 15 minutes apart between step {i-1} ('{t_prev}') "
                        f"and step {i} ('{t_curr}'): delta is {delta_mins} minutes."
                    )
            except Exception as e:
                if isinstance(e, ValueError) and "15 minutes" in str(e):
                    raise
                raise ValueError(f"Malformed timestamp formatting in forecast series: {e}") from e

        return window

    def initialize_state(
        self,
        start_time: str,
        initial_soc_percent: Optional[float] = None,
        battery_socs_override: Optional[Dict[str, float]] = None,
        topology_state: str = "standard",
    ) -> SequentialState:
        """Initializes the baseline immutable SequentialState for step 0."""
        soc_map: Dict[str, float] = {}
        for b in self.batteries:
            if battery_socs_override and b.id in battery_socs_override:
                soc_map[b.id] = float(battery_socs_override[b.id])
            elif initial_soc_percent is not None:
                soc_map[b.id] = float(initial_soc_percent)
            elif b.socPercent is not None:
                soc_map[b.id] = float(b.socPercent)
            else:
                soc_map[b.id] = 62.0

        if not soc_map and self.batteries:
            default_soc = initial_soc_percent if initial_soc_percent is not None else 62.0
            soc_map = {b.id: default_soc for b in self.batteries}

        return SequentialState(
            step_index=0,
            time=start_time,
            battery_socs=soc_map,
            topology_state=topology_state,
            cumulative_curtailment_kwh=0.0,
            cumulative_loss_kwh=0.0,
            switch_count=0,
            last_battery_power_kw=0.0,
        )

    def generate_candidate_controls(
        self,
        state: SequentialState,
        solar_kw: float,
        load_kw: float,
    ) -> List[Dict[str, Any]]:
        """
        Generates a bounded, physical set of candidate control actions for a single timestep:
        - Idle / zero dispatch
        - Battery charging (absorption)
        - Battery discharging (peak shaving)
        - Feeder switching (if supported)
        - Solar curtailment (if solar > 0)
        - Coordinated hybrid control
        """
        candidates: List[Dict[str, Any]] = []

        # 1. Idle (Baseline)
        candidates.append({
            "action_type": ControllerActionType.IDLE,
            "battery_power_kw": 0.0,
            "curtailment_kw": 0.0,
            "target_topology": state.topology_state,
            "title": "Float / Idle",
            "desc": "Maintain zero battery dispatch and standard operation.",
        })

        net_imbalance = solar_kw - load_kw
        agg_soc = state.aggregate_soc_percent

        # 2. Battery Charging (Solar Absorption)
        if self.batteries and agg_soc < 95.0 and self.total_max_chg_kw > 0:
            p_chg_max = min(self.total_max_chg_kw, max(10.0, net_imbalance) if net_imbalance > 0 else self.total_max_chg_kw)
            candidates.append({
                "action_type": ControllerActionType.BATTERY_DISPATCH,
                "battery_power_kw": -round(p_chg_max, 1),
                "curtailment_kw": 0.0,
                "target_topology": state.topology_state,
                "title": f"BESS Absorption (-{p_chg_max:.0f} kW)",
                "desc": f"Charge battery storage at {p_chg_max:.0f} kW to absorb local solar surplus.",
            })
            if p_chg_max > 20.0:
                candidates.append({
                    "action_type": ControllerActionType.BATTERY_DISPATCH,
                    "battery_power_kw": -round(p_chg_max * 0.5, 1),
                    "curtailment_kw": 0.0,
                    "target_topology": state.topology_state,
                    "title": f"BESS Moderate Charge (-{p_chg_max * 0.5:.0f} kW)",
                    "desc": f"Charge battery storage at {p_chg_max * 0.5:.0f} kW.",
                })

        # 3. Battery Discharging (Peak Shaving)
        if self.batteries and agg_soc > 20.0 and self.total_max_dischg_kw > 0:
            p_dischg_max = min(self.total_max_dischg_kw, max(10.0, abs(net_imbalance)) if net_imbalance < 0 else self.total_max_dischg_kw)
            candidates.append({
                "action_type": ControllerActionType.BATTERY_DISPATCH,
                "battery_power_kw": +round(p_dischg_max, 1),
                "curtailment_kw": 0.0,
                "target_topology": state.topology_state,
                "title": f"BESS Discharge (+{p_dischg_max:.0f} kW)",
                "desc": f"Inject stored battery energy at {p_dischg_max:.0f} kW to relieve feeder demand.",
            })
            if p_dischg_max > 20.0:
                candidates.append({
                    "action_type": ControllerActionType.BATTERY_DISPATCH,
                    "battery_power_kw": +round(p_dischg_max * 0.5, 1),
                    "curtailment_kw": 0.0,
                    "target_topology": state.topology_state,
                    "title": f"BESS Moderate Discharge (+{p_dischg_max * 0.5:.0f} kW)",
                    "desc": f"Inject stored battery energy at {p_dischg_max * 0.5:.0f} kW.",
                })

        # 4. Feeder Reconfiguration (Toggle Topology)
        if self.supports_alternative_topology:
            alt_topology = "alternative" if state.topology_state == "standard" else "standard"
            candidates.append({
                "action_type": ControllerActionType.FEEDER_RECONFIGURATION,
                "battery_power_kw": 0.0,
                "curtailment_kw": 0.0,
                "target_topology": alt_topology,
                "title": f"Switch Feeder Topology ({alt_topology})",
                "desc": f"Reconfigure feeder tie-switch to {alt_topology} configuration.",
            })

        # 5. Solar Curtailment
        if solar_kw > 10.0:
            c_low = round(solar_kw * 0.25, 1)
            candidates.append({
                "action_type": ControllerActionType.SOLAR_CURTAILMENT,
                "battery_power_kw": 0.0,
                "curtailment_kw": c_low,
                "target_topology": state.topology_state,
                "title": f"Solar Curtailment (-{c_low:.0f} kW)",
                "desc": f"Curtail {c_low:.0f} kW active PV generation to suppress voltage rise.",
            })
            if solar_kw > 40.0:
                c_high = round(solar_kw * 0.50, 1)
                candidates.append({
                    "action_type": ControllerActionType.SOLAR_CURTAILMENT,
                    "battery_power_kw": 0.0,
                    "curtailment_kw": c_high,
                    "target_topology": state.topology_state,
                    "title": f"Deep Solar Curtailment (-{c_high:.0f} kW)",
                    "desc": f"Curtail {c_high:.0f} kW active PV generation.",
                })

        # 6. Coordinated Hybrid Plan (Absorption + Alternative Topology)
        if self.supports_alternative_topology and self.batteries and agg_soc < 95.0:
            p_chg = min(self.total_max_chg_kw, 40.0)
            candidates.append({
                "action_type": ControllerActionType.HYBRID_PLAN,
                "battery_power_kw": -round(p_chg, 1),
                "curtailment_kw": 0.0,
                "target_topology": "alternative",
                "title": f"Hybrid Plan (Absorption -{p_chg:.0f} kW + Alt Topology)",
                "desc": f"Coordinated {p_chg:.0f} kW charging with alternative tie-line reconfiguration.",
            })

        return candidates

    def simulate_step(
        self,
        current_state: SequentialState,
        control: Dict[str, Any],
        solar_kw: float,
        load_kw: float,
    ) -> Tuple[SequentialState, PlannedStepAction, float, int]:
        """
        Executes genuine physical power flow and constraints for a single timestep candidate.
        Propagates immutable state forward: state_k -> state_{k+1}.
        Returns (new_state, planned_step_action, step_cost, violations_count).
        """
        p_bat = float(control["battery_power_kw"])
        c_curt = max(0.0, min(solar_kw, float(control["curtailment_kw"])))
        target_top = str(control["target_topology"])

        # 1. Authoritative physical solver evaluation
        solver = self.pf_alternative if target_top == "alternative" else self.pf_standard
        self.physical_solve_counter += 1

        buses, feeders, losses_kw, tx_loading = solver.solve(
            grid=self.grid,
            solar_kw=solar_kw,
            load_kw=load_kw,
            battery_power_kw=p_bat,
            solar_curtailment_kw=c_curt,
            installed_solar_capacity_kw=sum(u.capacityKw for u in self.grid.solarUnits if u.capacityKw) or 250.0,
        )

        step_violations = ConstraintChecker.check_all(
            buses=buses,
            feeders=feeders,
            time_str=current_state.time,
            config=self.limits,
            transformer=self.grid.substation,
            tx_loading_pct=tx_loading,
            tx_flow_kva=getattr(solver, "last_tx_flow_kva", None),
        )

        # 2. Extract critical telemetry
        v_crit = max(buses, key=lambda b: abs(b.voltage - 1.0)).voltage if buses else 1.0
        f_crit = max(feeders, key=lambda f: f.loadingPercent).loadingPercent if feeders else 50.0

        # 3. Propagate battery SOC forward for each individual battery unit
        new_soc_map: Dict[str, float] = {}
        dt = self.step_duration_hours
        tot_cap = self.total_battery_cap_kwh or 1.0

        for b in self.batteries:
            old_soc = current_state.battery_socs.get(b.id, 62.0)
            # Allocate power proportionally by capacity
            b_ratio = b.capacityKwh / tot_cap
            p_b = p_bat * b_ratio
            b_cap = max(1.0, b.capacityKwh)

            if p_b > 0:  # Discharge
                energy_kwh = (p_b * dt) / 0.92
                delta_soc = (energy_kwh / b_cap) * 100.0
                new_soc = max(0.0, round(old_soc - delta_soc, 3))
            elif p_b < 0:  # Charge
                energy_kwh = (abs(p_b) * dt) * 0.92
                delta_soc = (energy_kwh / b_cap) * 100.0
                new_soc = min(100.0, round(old_soc + delta_soc, 3))
            else:
                new_soc = old_soc

            new_soc_map[b.id] = new_soc

        mean_soc_before = current_state.aggregate_soc_percent
        mean_soc_after = sum(new_soc_map.values()) / len(new_soc_map) if new_soc_map else mean_soc_before

        # Check hard battery boundary violations
        soc_violation = any(s < 15.0 or s > 98.0 for s in new_soc_map.values())
        if soc_violation:
            total_viols = len(step_violations) + 1
        else:
            total_viols = len(step_violations)

        # 4. Compute multi-objective step cost
        # Hard penalty: violations are heavily penalized
        j_hard = total_viols * 10000.0

        # Soft preferences:
        # Solar curtailment energy loss
        curt_energy_kwh = c_curt * dt
        j_curt = curt_energy_kwh * 50.0

        # Technical line loss
        loss_energy_kwh = losses_kw * dt
        j_loss = loss_energy_kwh * 5.0

        # Switching churn penalty
        is_switch = int(target_top != current_state.topology_state)
        j_switch = is_switch * 80.0

        # Voltage deviation penalty
        j_voltage = abs(v_crit - 1.0) * 100.0

        # Power ramp smoothness penalty
        j_ramp = abs(p_bat - current_state.last_battery_power_kw) * 0.05

        step_cost = j_hard + j_curt + j_loss + j_switch + j_voltage + j_ramp

        # 5. Build next immutable state
        # Parse next timestamp
        h, m = map(int, current_state.time.split(":"))
        next_m = (m + int(round(dt * 60))) % 60
        next_h = (h + (m + int(round(dt * 60))) // 60) % 24
        next_time_str = f"{next_h:02d}:{next_m:02d}"

        new_state = SequentialState(
            step_index=current_state.step_index + 1,
            time=next_time_str,
            battery_socs=new_soc_map,
            topology_state=target_top,
            cumulative_curtailment_kwh=current_state.cumulative_curtailment_kwh + curt_energy_kwh,
            cumulative_loss_kwh=current_state.cumulative_loss_kwh + loss_energy_kwh,
            switch_count=current_state.switch_count + is_switch,
            last_battery_power_kw=p_bat,
        )

        planned_action = PlannedStepAction(
            stepIndex=current_state.step_index,
            time=current_state.time,
            actionType=control["action_type"],
            title=control["title"],
            batteryPowerKw=p_bat,
            curtailmentKw=c_curt,
            targetTopology=target_top,
            batterySocBefore=round(mean_soc_before, 2),
            batterySocAfter=round(mean_soc_after, 2),
            batterySocsAfter={k: round(v, 2) for k, v in new_soc_map.items()},
            expectedVoltagePu=round(v_crit, 3),
            expectedFeederLoadPercent=round(f_crit, 1),
            expectedTxLoadingPercent=round(tx_loading, 1),
            totalLossKw=round(losses_kw, 2),
            violationsCount=total_viols,
            isPhysicallyVerified=True,
            solverConverged=True,
            stepCost=round(step_cost, 2),
        )

        return new_state, planned_action, step_cost, total_viols

    def _evaluate_candidates_direct(
        self,
        beam: List[TrajectoryCandidate],
        solar_kw: float,
        load_kw: float,
    ) -> List[TrajectoryCandidate]:
        """Direct physical solver evaluation without surrogate screening."""
        next_candidates: List[TrajectoryCandidate] = []
        for parent in beam:
            parent_state = parent.state_sequence[-1]
            controls = self.generate_candidate_controls(parent_state, solar_kw, load_kw)

            for ctrl in controls:
                next_state, action_item, step_cost, step_viols = self.simulate_step(
                    current_state=parent_state,
                    control=ctrl,
                    solar_kw=solar_kw,
                    load_kw=load_kw,
                )

                is_hard_feasible = parent.is_hard_feasible and (step_viols == 0)
                new_cum_cost = parent.total_cost + step_cost
                new_cum_viols = parent.total_violations + step_viols

                next_candidates.append(
                    TrajectoryCandidate(
                        state_sequence=parent.state_sequence + [next_state],
                        action_sequence=parent.action_sequence + [action_item],
                        total_cost=new_cum_cost,
                        total_violations=new_cum_viols,
                        is_hard_feasible=is_hard_feasible,
                    )
                )

        next_candidates.sort(key=lambda c: (c.total_violations, c.total_cost))
        return next_candidates

    def _evaluate_candidates_with_surrogate(
        self,
        beam: List[TrajectoryCandidate],
        solar_kw: float,
        load_kw: float,
    ) -> List[TrajectoryCandidate]:
        """
        Safely screens candidate transitions using trained power-flow surrogate models.
        Preserves fallback pool and evaluates all necessary candidates physically.
        Never lets surrogate independently certify safety (isPhysicallyVerified=True
        remains strictly reserved for physical PowerFlowEngine.solve()).
        """
        # 1. Collect candidate transitions (parent, ctrl)
        all_candidates: List[Tuple[TrajectoryCandidate, Dict[str, Any]]] = []
        for parent in beam:
            parent_state = parent.state_sequence[-1]
            controls = self.generate_candidate_controls(parent_state, solar_kw, load_kw)
            for ctrl in controls:
                all_candidates.append((parent, ctrl))

        if not all_candidates:
            return []

        # 2. Check surrogate applicability (Phase B)
        grid_supported = self.surrogate_engine.is_grid_supported(self.grid.id)
        model_payload = self.surrogate_engine.get_model(self.grid.id) if grid_supported else None
        finite_env = math.isfinite(solar_kw) and math.isfinite(load_kw)

        if not (grid_supported and model_payload is not None and finite_env):
            # Route all to fallback physical evaluation
            self.surrogate_fallback_counter += len(all_candidates)
            return self._evaluate_candidates_direct(beam, solar_kw, load_kw)

        model = model_payload.get("model")
        v_targets = model_payload.get("voltage_targets")
        load_targets = model_payload.get("loading_targets")
        target_names = model_payload.get("target_names")

        if not (model is not None and v_targets and load_targets and target_names):
            self.surrogate_fallback_counter += len(all_candidates)
            return self._evaluate_candidates_direct(beam, solar_kw, load_kw)

        v_indices = [target_names.index(c) for c in v_targets]
        f_indices = [target_names.index(c) for c in load_targets]
        tx_idx = target_names.index("tx_loading_percent")

        installed_solar = sum(u.capacityKw for u in self.grid.solarUnits if u.capacityKw) or 250.0
        tx_rating = float(getattr(getattr(self.grid, "substation", None), "ratingKva", 500.0))
        dt = self.step_duration_hours

        # 3. Validate topology and build feature rows per candidate
        valid_indices: List[int] = []
        feature_rows: List[np.ndarray] = []
        fallback_candidates: List[Tuple[TrajectoryCandidate, Dict[str, Any]]] = []

        for idx, (parent, ctrl) in enumerate(all_candidates):
            parent_state = parent.state_sequence[-1]
            is_valid_topo, alt_val, _ = self.surrogate_engine.validate_candidate_topology(
                ctrl, self.grid
            )
            agg_soc = parent_state.aggregate_soc_percent

            if not is_valid_topo or not math.isfinite(agg_soc):
                fallback_candidates.append((parent, ctrl))
                continue

            p_bat = float(ctrl["battery_power_kw"])
            c_curt = max(0.0, min(solar_kw, float(ctrl["curtailment_kw"])))
            is_alt = bool(alt_val == 1.0)

            row = self.surrogate_engine.build_feature_row(
                solar_kw=solar_kw,
                load_kw=load_kw,
                battery_power_kw=p_bat,
                solar_curtailment_kw=c_curt,
                is_alternative_topology=is_alt,
                battery_soc_percent=agg_soc,
                installed_solar_capacity_kw=installed_solar,
                transformer_rating_kva=tx_rating,
            )

            if not np.all(np.isfinite(row)):
                fallback_candidates.append((parent, ctrl))
                continue

            valid_indices.append(idx)
            feature_rows.append(row)

        # 4. Perform surrogate screening on valid feature rows
        screened_safe_candidates: List[Tuple[TrajectoryCandidate, Dict[str, Any]]] = []

        if feature_rows:
            X_mat = np.vstack(feature_rows)
            try:
                preds = model.predict(X_mat)
                if not np.all(np.isfinite(preds)):
                    raise ValueError("Non-finite surrogate predictions detected.")

                for row_idx, cand_idx in enumerate(valid_indices):
                    cand = all_candidates[cand_idx]
                    pred_v = preds[row_idx, v_indices]
                    pred_f = preds[row_idx, f_indices]
                    pred_tx = float(preds[row_idx, tx_idx])

                    # Check conservative screening bounds
                    v_safe = np.all((pred_v >= self.surrogate_engine.DEFAULT_V_MIN_PU) & (pred_v <= self.surrogate_engine.DEFAULT_V_MAX_PU))
                    f_safe = np.all(pred_f <= self.surrogate_engine.DEFAULT_FEEDER_MAX_PCT)
                    tx_safe = pred_tx <= self.surrogate_engine.DEFAULT_TX_MAX_PCT

                    self.surrogate_eval_counter += 1

                    if v_safe and f_safe and tx_safe:
                        screened_safe_candidates.append(cand)
                    else:
                        fallback_candidates.append(cand)

            except Exception as e:
                logger.warning(f"[SequentialController] Surrogate inference failed: {e}. Falling back to physical solver.")
                self.surrogate_fallback_counter += len(feature_rows)
                for cand_idx in valid_indices:
                    fallback_candidates.append(all_candidates[cand_idx])

        self.surrogate_fallback_counter += len(fallback_candidates)

        # 5. Evaluate candidates physically with fallback preservation
        evaluated_candidates: List[TrajectoryCandidate] = []

        def compute_min_cost(p: TrajectoryCandidate, c: Dict[str, Any]) -> float:
            c_kw = max(0.0, min(solar_kw, float(c["curtailment_kw"])))
            is_sw = int(str(c["target_topology"]) != p.state_sequence[-1].topology_state)
            p_b = float(c["battery_power_kw"])
            rmp = abs(p_b - p.state_sequence[-1].last_battery_power_kw) * 0.05
            return p.total_cost + (c_kw * dt * 50.0) + (is_sw * 80.0) + rmp

        # First, physically evaluate all candidates in screened safe pool
        for parent, ctrl in screened_safe_candidates:
            parent_state = parent.state_sequence[-1]
            next_state, action_item, step_cost, step_viols = self.simulate_step(
                current_state=parent_state,
                control=ctrl,
                solar_kw=solar_kw,
                load_kw=load_kw,
            )
            evaluated_candidates.append(
                TrajectoryCandidate(
                    state_sequence=parent.state_sequence + [next_state],
                    action_sequence=parent.action_sequence + [action_item],
                    total_cost=parent.total_cost + step_cost,
                    total_violations=parent.total_violations + step_viols,
                    is_hard_feasible=parent.is_hard_feasible and (step_viols == 0),
                )
            )

        evaluated_candidates.sort(key=lambda c: (c.total_violations, c.total_cost))

        # Check fallback candidates
        fallback_candidates.sort(key=lambda item: compute_min_cost(item[0], item[1]))

        for parent, ctrl in fallback_candidates:
            feasible_evaluated = [c for c in evaluated_candidates if c.total_violations == 0]
            if len(feasible_evaluated) >= self.beam_width:
                cutoff_cost = feasible_evaluated[self.beam_width - 1].total_cost
                min_cost = compute_min_cost(parent, ctrl)
                if min_cost >= cutoff_cost:
                    # Mathematically impossible to beat the beam; safely prune without physical solve
                    self.surrogate_pruned_counter += 1
                    continue

            # Candidate could improve beam or safe pool lacks feasible candidates
            parent_state = parent.state_sequence[-1]
            next_state, action_item, step_cost, step_viols = self.simulate_step(
                current_state=parent_state,
                control=ctrl,
                solar_kw=solar_kw,
                load_kw=load_kw,
            )
            evaluated_candidates.append(
                TrajectoryCandidate(
                    state_sequence=parent.state_sequence + [next_state],
                    action_sequence=parent.action_sequence + [action_item],
                    total_cost=parent.total_cost + step_cost,
                    total_violations=parent.total_violations + step_viols,
                    is_hard_feasible=parent.is_hard_feasible and (step_viols == 0),
                )
            )
            evaluated_candidates.sort(key=lambda c: (c.total_violations, c.total_cost))

        return evaluated_candidates

    def plan(
        self,
        request: SequentialControlRequest,
    ) -> SequentialControlResponse:
        """
        Executes bounded receding-horizon trajectory optimization across the forecast window.
        Returns verified multi-step trajectory and immediate first action.
        """
        start_time = time.perf_counter()
        self.physical_solve_counter = 0
        self.surrogate_eval_counter = 0
        self.surrogate_fallback_counter = 0
        self.surrogate_pruned_counter = 0

        use_screening = self.use_surrogate_screening or getattr(request, "allowSurrogateScreening", False)

        # 1. Validate forecast series
        try:
            forecast_window = self.validate_forecast_series(
                forecast_points=request.forecastData or [],
                start_time=request.startTimestep,
                horizon_steps=request.horizonSteps,
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            return SequentialControlResponse(
                gridId=request.gridId,
                startTimestep=request.startTimestep,
                horizonSteps=request.horizonSteps,
                durationHours=request.horizonSteps * request.stepDurationHours,
                status=PlanStatus.ERROR,
                isFeasible=False,
                fallbackReason=f"Forecast validation error: {e}",
                physicalSolveCount=self.physical_solve_counter,
                planningLatencyMs=round(latency_ms, 2),
                terminalSocPercent=0.0,
                surrogateEvaluationCount=self.surrogate_eval_counter,
                surrogateFallbackCount=self.surrogate_fallback_counter,
                surrogatePrunedCount=self.surrogate_pruned_counter,
            )

        # 2. Initialize origin state
        init_topo = getattr(request, "initialTopology", "standard") or "standard"
        init_state = self.initialize_state(
            start_time=request.startTimestep,
            initial_soc_percent=request.initialSocPercent,
            battery_socs_override=request.batterySocs,
            topology_state=init_topo,
        )

        # Calculate baseline unmitigated violations for diagnostic reference
        init_baseline_violations = 0
        baseline_solver = self.pf_alternative if init_topo == "alternative" else self.pf_standard
        for pt in forecast_window:
            buses, feeders, _, tx = baseline_solver.solve(
                grid=self.grid,
                solar_kw=pt.solarKw,
                load_kw=pt.loadKw,
                battery_power_kw=0.0,
                solar_curtailment_kw=0.0,
            )
            v = ConstraintChecker.check_all(
                buses, feeders, pt.time, self.limits,
                transformer=self.grid.substation, tx_loading_pct=tx,
            )
            init_baseline_violations += len(v)

        # 3. Receding-Horizon Beam Search across H steps
        # Initialize beam with root candidate
        beam: List[TrajectoryCandidate] = [
            TrajectoryCandidate(
                state_sequence=[init_state],
                action_sequence=[],
                total_cost=0.0,
                total_violations=0,
                is_hard_feasible=True,
            )
        ]

        for step_idx in range(request.horizonSteps):
            fc_pt = forecast_window[step_idx]
            solar_kw = fc_pt.solarKw
            load_kw = fc_pt.loadKw

            if use_screening:
                evaluated_candidates = self._evaluate_candidates_with_surrogate(
                    beam=beam,
                    solar_kw=solar_kw,
                    load_kw=load_kw,
                )
            else:
                evaluated_candidates = self._evaluate_candidates_direct(
                    beam=beam,
                    solar_kw=solar_kw,
                    load_kw=load_kw,
                )

            # Sort and prune candidates by (total_violations, total_cost)
            beam = evaluated_candidates[: self.beam_width]

        # 4. Select best trajectory
        best_candidate = beam[0]
        planned_trajectory = best_candidate.action_sequence
        first_action = planned_trajectory[0] if planned_trajectory else None
        is_plan_feasible = (best_candidate.total_violations == 0)

        fallback_reason = None
        if not is_plan_feasible:
            fallback_reason = (
                f"No fully safe trajectory satisfies all constraints across {request.horizonSteps} timesteps. "
                f"Best plan incurs {best_candidate.total_violations} violation(s)."
            )

        terminal_soc = best_candidate.state_sequence[-1].aggregate_soc_percent
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return SequentialControlResponse(
            gridId=request.gridId,
            startTimestep=request.startTimestep,
            horizonSteps=request.horizonSteps,
            durationHours=round(request.horizonSteps * request.stepDurationHours, 2),
            status=PlanStatus.FEASIBLE if is_plan_feasible else PlanStatus.INFEASIBLE,
            isFeasible=is_plan_feasible,
            fallbackReason=fallback_reason,
            recommendedFirstAction=first_action,
            plannedTrajectory=planned_trajectory,
            initialViolationsTotal=init_baseline_violations,
            remainingViolationsTotal=best_candidate.total_violations,
            totalSolarCurtailmentKwh=round(best_candidate.state_sequence[-1].cumulative_curtailment_kwh, 2),
            totalLossKwh=round(best_candidate.state_sequence[-1].cumulative_loss_kwh, 2),
            switchingOperationsCount=best_candidate.state_sequence[-1].switch_count,
            terminalSocPercent=round(terminal_soc, 2),
            physicalSolveCount=self.physical_solve_counter,
            planningLatencyMs=round(latency_ms, 2),
            surrogateEvaluationCount=self.surrogate_eval_counter,
            surrogateFallbackCount=self.surrogate_fallback_counter,
            surrogatePrunedCount=self.surrogate_pruned_counter,
        )

    def replan(
        self,
        current_state: SequentialState,
        updated_forecast: List[SequentialForecastPoint],
        horizon_steps: int = 8,
        allow_surrogate_screening: Optional[bool] = None,
    ) -> SequentialControlResponse:
        """
        Executes receding-horizon replanning when actual telemetry deviates or new forecasts arrive.
        """
        use_screening = self.use_surrogate_screening if allow_surrogate_screening is None else bool(allow_surrogate_screening)
        req = SequentialControlRequest(
            gridId=self.grid.id,
            startTimestep=current_state.time,
            horizonSteps=horizon_steps,
            stepDurationHours=self.step_duration_hours,
            batterySocs=dict(current_state.battery_socs),
            initialTopology=current_state.topology_state,
            forecastData=updated_forecast,
            recedingHorizonMode=True,
            allowSurrogateScreening=use_screening,
        )
        return self.plan(req)
