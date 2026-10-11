import asyncio
import copy
import math
import time
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np

sys.path.insert(0, str(Path("backend")))

from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController, SequentialState, TrajectoryCandidate
from app.schemas.sequential_control import SequentialControlRequest, SequentialForecastPoint, ControllerActionType, PlannedStepAction, PlanStatus
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.surrogate_screening import SurrogateScreeningEngine

def make_forecast(steps: int) -> List[SequentialForecastPoint]:
    points = []
    for i in range(steps):
        h = (12 + (i * 15) // 60) % 24
        m = (i * 15) % 60
        solar = max(0.0, 120.0 * np.sin(np.pi * (i % 48) / 48.0))
        load = 40.0 + 30.0 * np.cos(np.pi * (i % 48) / 48.0)
        points.append(
            SequentialForecastPoint(
                time=f"{h:02d}:{m:02d}",
                solarKw=round(float(solar), 2),
                loadKw=round(float(load), 2),
            )
        )
    return points

class OptimizedSequentialController(SequentialController):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._solve_cache = {}
        self._setup_fast_surrogate()

    def _setup_fast_surrogate(self):
        payload = self.surrogate_engine.get_model(self.grid.id)
        if not payload:
            self._fast_surrogate = None
            return
        m = payload["model"]
        estimators = m.estimators_
        self._fast_surrogate = {
            "estimators": estimators,
            "n_est": len(estimators),
            "bin_mappers": [est._bin_mapper for est in estimators],
            "missing_bins": [est._bin_mapper.missing_values_bin_idx_ for est in estimators],
            "baselines": [est._baseline_prediction for est in estimators],
            "predictors_list": [est._predictors for est in estimators],
            "target_names": payload.get("target_names", []),
            "v_targets": payload.get("voltage_targets", []),
            "load_targets": payload.get("loading_targets", []),
        }

    def _fast_predict(self, X_mat: np.ndarray) -> np.ndarray:
        fs = self._fast_surrogate
        n_samples = X_mat.shape[0]
        n_est = fs["n_est"]
        preds = np.empty((n_samples, n_est), dtype=np.float64, order="C")
        bin_mappers = fs["bin_mappers"]
        missing_bins = fs["missing_bins"]
        baselines = fs["baselines"]
        predictors_list = fs["predictors_list"]
        for j in range(n_est):
            binned = bin_mappers[j].transform(X_mat)
            raw = np.zeros((n_samples, 1), dtype=np.float64, order="F") + baselines[j]
            miss_bin = missing_bins[j]
            for preds_i in predictors_list[j]:
                raw[:, 0] += preds_i[0].predict_binned(binned, missing_values_bin_idx=miss_bin, n_threads=1)
            preds[:, j] = raw[:, 0]
        return preds

    def simulate_step(
        self,
        current_state: SequentialState,
        control: Dict[str, Any],
        solar_kw: float,
        load_kw: float,
    ) -> Tuple[SequentialState, PlannedStepAction, float, int]:
        p_bat = float(control["battery_power_kw"])
        c_curt = max(0.0, min(solar_kw, float(control["curtailment_kw"])))
        target_top = str(control["target_topology"])

        # Cache key for physical solve
        cache_key = (
            self.grid.id,
            target_top,
            round(solar_kw, 2),
            round(load_kw, 2),
            round(p_bat, 2),
            round(c_curt, 2),
            round(self.installed_solar_capacity_kw or 250.0, 2),
        )

        solver = self.pf_alternative if target_top == "alternative" else self.pf_standard
        if cache_key in self._solve_cache:
            buses, feeders, losses_kw, tx_loading, step_violations = self._solve_cache[cache_key]
        else:
            self.physical_solve_counter += 1
            grid_copy = self.grid.model_copy(deep=True)
            buses, feeders, losses_kw, tx_loading = solver.solve(
                grid=grid_copy,
                solar_kw=solar_kw,
                load_kw=load_kw,
                battery_power_kw=p_bat,
                solar_curtailment_kw=c_curt,
                installed_solar_capacity_kw=self.installed_solar_capacity_kw,
            )
            step_violations = ConstraintChecker.check_all(
                buses=buses,
                feeders=feeders,
                time_str=current_state.time,
                config=self.limits,
                transformer=grid_copy.substation,
                tx_loading_pct=tx_loading,
                tx_flow_kva=getattr(solver, "last_tx_flow_kva", None),
            )
            self._solve_cache[cache_key] = (buses, feeders, losses_kw, tx_loading, step_violations)

        v_crit = max(buses, key=lambda b: abs(b.voltage - 1.0)).voltage if buses else 1.0
        f_crit = max(feeders, key=lambda f: f.loadingPercent).loadingPercent if feeders else 50.0

        new_soc_map: Dict[str, float] = {}
        dt = self.step_duration_hours
        tot_cap = self.total_battery_cap_kwh or 1.0

        for b in self.batteries:
            old_soc = current_state.battery_socs.get(b.id, 62.0)
            b_ratio = b.capacityKwh / tot_cap
            p_b = p_bat * b_ratio
            b_cap = max(1.0, b.capacityKwh)
            if p_b > 0:
                energy_kwh = (p_b * dt) / 0.92
                delta_soc = (energy_kwh / b_cap) * 100.0
                new_soc = max(0.0, round(old_soc - delta_soc, 3))
            elif p_b < 0:
                energy_kwh = (abs(p_b) * dt) * 0.92
                delta_soc = (energy_kwh / b_cap) * 100.0
                new_soc = min(100.0, round(old_soc + delta_soc, 3))
            else:
                new_soc = old_soc
            new_soc_map[b.id] = new_soc

        mean_soc_before = current_state.aggregate_soc_percent
        mean_soc_after = sum(new_soc_map.values()) / len(new_soc_map) if new_soc_map else mean_soc_before

        soc_violation = any(s < 15.0 or s > 98.0 for s in new_soc_map.values())
        total_viols = len(step_violations) + 1 if soc_violation else len(step_violations)

        j_hard = total_viols * 10000.0
        curt_energy_kwh = c_curt * dt
        j_curt = curt_energy_kwh * 50.0
        loss_energy_kwh = losses_kw * dt
        j_loss = loss_energy_kwh * 5.0
        is_switch = int(target_top != current_state.topology_state)
        j_switch = is_switch * 80.0
        j_voltage = abs(v_crit - 1.0) * 100.0
        j_ramp = abs(p_bat - current_state.last_battery_power_kw) * 0.05
        step_cost = j_hard + j_curt + j_loss + j_switch + j_voltage + j_ramp

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

    def _evaluate_candidates_with_surrogate(
        self,
        beam: List[TrajectoryCandidate],
        solar_kw: float,
        load_kw: float,
    ) -> List[TrajectoryCandidate]:
        all_candidates: List[Tuple[TrajectoryCandidate, Dict[str, Any]]] = []
        for parent in beam:
            parent_state = parent.state_sequence[-1]
            controls = self.generate_candidate_controls(parent_state, solar_kw, load_kw)
            for ctrl in controls:
                all_candidates.append((parent, ctrl))

        if not all_candidates:
            return []

        if not self._fast_surrogate or not (math.isfinite(solar_kw) and math.isfinite(load_kw)):
            self.surrogate_fallback_counter += len(all_candidates)
            return self._evaluate_candidates_direct(beam, solar_kw, load_kw)

        fs = self._fast_surrogate
        target_names = fs["target_names"]
        v_targets = fs["v_targets"]
        load_targets = fs["load_targets"]
        v_indices = [target_names.index(c) for c in v_targets]
        f_indices = [target_names.index(c) for c in load_targets]
        tx_idx = target_names.index("tx_loading_percent")
        loss_idx = target_names.index("total_loss_kw") if "total_loss_kw" in target_names else None

        installed_solar = self.installed_solar_capacity_kw or 250.0
        tx_rating = float(getattr(getattr(self.grid, "substation", None), "ratingKva", 500.0))
        dt = self.step_duration_hours

        # Vectorized feature rows
        valid_indices: List[int] = []
        feature_rows: List[np.ndarray] = []
        fallback_candidates: List[Tuple[TrajectoryCandidate, Dict[str, Any]]] = []

        for idx, (parent, ctrl) in enumerate(all_candidates):
            parent_state = parent.state_sequence[-1]
            is_valid_topo, alt_val, _ = self.surrogate_engine.validate_candidate_topology(ctrl, self.grid)
            agg_soc = parent_state.aggregate_soc_percent
            if not is_valid_topo or not math.isfinite(agg_soc):
                fallback_candidates.append((parent, ctrl))
                continue

            p_bat = float(ctrl["battery_power_kw"])
            c_curt = max(0.0, min(solar_kw, float(ctrl["curtailment_kw"])))
            is_alt = bool(alt_val == 1.0)
            net_solar = max(0.0, float(solar_kw) - float(c_curt))
            net_imbalance = net_solar + p_bat - float(load_kw)

            row = [
                float(solar_kw),
                float(load_kw),
                p_bat,
                c_curt,
                net_solar,
                net_imbalance,
                1.0 if is_alt else 0.0,
                agg_soc,
                installed_solar,
                tx_rating,
            ]
            valid_indices.append(idx)
            feature_rows.append(row)

        if not feature_rows:
            self.surrogate_fallback_counter += len(all_candidates)
            return self._evaluate_candidates_direct(beam, solar_kw, load_kw)

        # Batch predict
        X_mat = np.array(feature_rows, dtype=np.float64)
        try:
            preds = self._fast_predict(X_mat)
            self.surrogate_eval_counter += len(valid_indices)
        except Exception as e:
            self.surrogate_fallback_counter += len(all_candidates)
            return self._evaluate_candidates_direct(beam, solar_kw, load_kw)

        # Score & Rank candidates
        ranked_candidates: List[Tuple[float, int, TrajectoryCandidate, Dict[str, Any]]] = []

        for row_idx, cand_idx in enumerate(valid_indices):
            cand_parent, cand_ctrl = all_candidates[cand_idx]
            pred_v = preds[row_idx, v_indices]
            pred_f = preds[row_idx, f_indices]
            pred_tx = float(preds[row_idx, tx_idx])
            pred_loss = float(preds[row_idx, loss_idx]) if loss_idx is not None else 5.0

            # Conservative check
            v_safe = np.all((pred_v >= self.surrogate_engine.DEFAULT_V_MIN_PU) & (pred_v <= self.surrogate_engine.DEFAULT_V_MAX_PU))
            f_safe = np.all(pred_f <= self.surrogate_engine.DEFAULT_FEEDER_MAX_PCT)
            tx_safe = pred_tx <= self.surrogate_engine.DEFAULT_TX_MAX_PCT

            pred_viols = 0 if (v_safe and f_safe and tx_safe) else 1
            if not v_safe:
                # count severe violations
                severe_v = np.sum((pred_v < 0.95) | (pred_v > 1.05))
                pred_viols += int(severe_v)
            if not f_safe:
                pred_viols += int(np.sum(pred_f > 100.0))
            if not tx_safe and pred_tx > 100.0:
                pred_viols += 1

            p_b = float(cand_ctrl["battery_power_kw"])
            c_kw = max(0.0, min(solar_kw, float(cand_ctrl["curtailment_kw"])))
            is_sw = int(str(cand_ctrl["target_topology"]) != cand_parent.state_sequence[-1].topology_state)
            v_crit_pred = max(abs(pred_v - 1.0)) if len(pred_v) else 0.0

            # Estimated total cost
            est_step_cost = (
                (pred_viols * 10000.0)
                + (c_kw * dt * 50.0)
                + (max(0.0, pred_loss) * dt * 5.0)
                + (is_sw * 80.0)
                + (v_crit_pred * 100.0)
                + (abs(p_b - cand_parent.state_sequence[-1].last_battery_power_kw) * 0.05)
            )
            est_total_cost = cand_parent.total_cost + est_step_cost
            ranked_candidates.append((est_total_cost, pred_viols, cand_parent, cand_ctrl))

        # Add fallback candidates at the back
        for cand_parent, cand_ctrl in fallback_candidates:
            ranked_candidates.append((999999.0, 5, cand_parent, cand_ctrl))

        # Sort: fewest predicted violations, then lowest estimated cost
        ranked_candidates.sort(key=lambda item: (item[1], item[0]))

        # Shortlist evaluation with physical verification & mathematical pruning
        evaluated_candidates: List[TrajectoryCandidate] = []

        def compute_min_cost(p: TrajectoryCandidate, c: Dict[str, Any]) -> float:
            c_kw = max(0.0, min(solar_kw, float(c["curtailment_kw"])))
            is_sw = int(str(c["target_topology"]) != p.state_sequence[-1].topology_state)
            p_b = float(c["battery_power_kw"])
            rmp = abs(p_b - p.state_sequence[-1].last_battery_power_kw) * 0.05
            return p.total_cost + (c_kw * dt * 50.0) + (is_sw * 80.0) + rmp

        for _, pred_viols, parent, ctrl in ranked_candidates:
            feasible_evaluated = [c for c in evaluated_candidates if c.total_violations == 0]
            if len(feasible_evaluated) >= self.beam_width:
                cutoff_cost = feasible_evaluated[self.beam_width - 1].total_cost
                min_cost = compute_min_cost(parent, ctrl)
                # If even with 0 violations and 0 losses it cannot beat the beam:
                if min_cost >= cutoff_cost or (pred_viols > 0 and min_cost + 10000.0 >= cutoff_cost):
                    self.surrogate_pruned_counter += 1
                    continue

            # Physically evaluate
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

async def test_comparison():
    repo = NetworkRepository()
    for grid_id in ["default-grid", "medium-test-grid", "large-test-grid"]:
        grid = await repo.get_grid(grid_id)
        for H in [8, 24]:
            forecast = make_forecast(H)
            req = SequentialControlRequest(
                gridId=grid.id,
                startTimestep="12:00",
                horizonSteps=H,
                forecastData=forecast,
                allowSurrogateScreening=False,
            )
            
            # Direct
            ctrl_dir = SequentialController(grid=grid, use_surrogate_screening=False)
            t0 = time.perf_counter()
            r_dir = ctrl_dir.plan(req)
            t_dir = (time.perf_counter() - t0) * 1000.0

            # Optimized Surrogate
            req_surr = req.model_copy(update={"allowSurrogateScreening": True})
            ctrl_opt = OptimizedSequentialController(grid=grid, use_surrogate_screening=True)
            t0 = time.perf_counter()
            r_opt = ctrl_opt.plan(req_surr)
            t_opt = (time.perf_counter() - t0) * 1000.0

            print(f"\nGrid: {grid_id} | H={H}")
            print(f"  Direct: Solves={r_dir.physicalSolveCount} | Latency={t_dir:.1f}ms | Feas={r_dir.isFeasible}")
            print(f"  Optimized: Solves={r_opt.physicalSolveCount} (Pruned={r_opt.surrogatePrunedCount}) | Latency={t_opt:.1f}ms | Feas={r_opt.isFeasible}")
            print(f"  Speedup: {t_dir / t_opt:.2f}x | Solves reduction: {(1 - r_opt.physicalSolveCount / r_dir.physicalSolveCount)*100:.1f}%")
            
            # Check match
            match = [a1.actionType == a2.actionType and a1.batteryPowerKw == a2.batteryPowerKw for a1, a2 in zip(r_dir.plannedTrajectory, r_opt.plannedTrajectory)]
            print(f"  Trajectory match: {all(match)} ({sum(match)}/{len(match)})")

asyncio.run(test_comparison())
