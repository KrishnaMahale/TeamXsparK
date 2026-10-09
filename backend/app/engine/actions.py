import copy
import math
from typing import List, Tuple, Optional, Dict, Any
from app.schemas.action import CorrectiveAction, HybridActionPlan
from app.schemas.battery import BatteryStorageConfig
from app.schemas.simulation import (
    BeforeAfterComparisonData,
    BeforeAfterComparisonPoint,
    BeforeAfterSolarUsed,
    BeforeAfterBatterySoc,
    NetworkLimitsConfig,
    SimulationInput,
)
from app.schemas.network import GridNetwork, Bus, Feeder
from app.schemas.violation import ViolationType, ViolationSeverity
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.battery import BatteryEngine


class ActionEngine:
    @staticmethod
    def evaluate_candidate_actions(
        peak_solar_kw: float,
        peak_load_kw: float,
        battery_config: BatteryStorageConfig,
        v_max: float = 1.05,
        v_min: float = 0.95,
        feeder_max: float = 100.0,
        installed_capacity_kw: float = 250.0,
        grid: Optional[GridNetwork] = None,
        eval_time: str = "13:15",
        eval_battery_soc: Optional[float] = None,
        all_times: Optional[List[str]] = None,
        solar_times: Optional[Dict[str, float]] = None,
        load_times: Optional[Dict[str, float]] = None,
        input_data: Optional[SimulationInput] = None,
        include_hybrid: bool = False,
    ) -> Tuple[List[CorrectiveAction], str, BeforeAfterComparisonData]:
        """
        Evaluates candidate corrective actions against the specified grid operating condition.
        Dynamic Phase 3B & 3C features:
        - Violation-aware regime detection (Overvoltage, Undervoltage, Feeder Overload, Transformer Overload).
        - Bounded bisection search for minimal effective battery dispatch (tolerance <= 1.0 kW).
        - Bounded bisection search for minimal effective active-power solar curtailment (tolerance <= 1.0 kW).
        - Supported feeder reconfiguration verification.
        - Hybrid plan generation and joint magnitude optimization.
        - Full-horizon safety verification across diurnal operating timeline.
        - Transparent hierarchical safety-first candidate ranking.
        - Explicit numerical control parameters populated for all candidates.
        """
        if grid is None:
            from app.db.repositories.network_repository import initialize_default_grid
            grid = initialize_default_grid()

        b_engine = BatteryEngine(battery_config)
        limits = NetworkLimitsConfig(
            voltageMinPu=v_min,
            voltageMaxPu=v_max,
            feederLoadingLimitPercent=feeder_max,
        )

        soc_start = float(eval_battery_soc if eval_battery_soc is not None else battery_config.initialSocPercent)

        # 1. Baseline Power Flow on an isolated copy of the grid at the selected operating point
        grid_base = copy.deepcopy(grid)
        pf_base = PowerFlowEngine(is_alternative_topology=False)
        base_buses, base_feeders, _, _ = pf_base.solve(
            grid=grid_base,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            installed_solar_capacity_kw=installed_capacity_kw,
        )

        base_step_violations = ConstraintChecker.check_all(
            base_buses, base_feeders, eval_time, limits,
            transformer=grid_base.substation,
            tx_loading_pct=getattr(pf_base, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_base, "last_tx_flow_kva", None),
        )
        base_violations = len(base_step_violations)

        # Identify monitored critical bus (furthest deviation from 1.0 pu)
        if base_buses:
            viol_buses = [b for b in base_buses if b.voltage > v_max or b.voltage < v_min]
            if viol_buses:
                crit_bus = max(viol_buses, key=lambda b: abs(b.voltage - 1.0))
            else:
                crit_bus = max(base_buses, key=lambda b: abs(b.voltage - 1.0))
        else:
            crit_bus = Bus(id="B-0", name="Main Bus", voltage=1.0)

        # Identify monitored critical feeder (highest loading)
        if base_feeders:
            viol_feeders = [f for f in base_feeders if f.loadingPercent > feeder_max]
            if viol_feeders:
                crit_feeder = max(viol_feeders, key=lambda f: f.loadingPercent)
            else:
                crit_feeder = max(base_feeders, key=lambda f: f.loadingPercent)
        else:
            crit_feeder = Feeder(id="F-0", name="Main Feeder", loadingPercent=50.0, fromBus="B-0", toBus="B-0")

        crit_bus_id = crit_bus.id
        crit_bus_name = crit_bus.name or crit_bus.id
        base_v_crit = crit_bus.voltage

        crit_feeder_id = crit_feeder.id
        crit_feeder_name = crit_feeder.name or crit_feeder.id
        base_f_crit_load = crit_feeder.loadingPercent

        # Violation regime flags
        has_overvoltage = any(v.type == ViolationType.OVER_VOLTAGE for v in base_step_violations)
        has_undervoltage = any(v.type == ViolationType.UNDER_VOLTAGE for v in base_step_violations)
        has_feeder_overload = any(v.type == ViolationType.FEEDER_OVERLOAD for v in base_step_violations)
        has_tx_overload = any(v.type == ViolationType.TRANSFORMER_OVERLOAD for v in base_step_violations)

        actions: List[CorrectiveAction] = []

        # =========================================================================
        # 1. ACTION 1: Bounded Battery Energy Storage Dispatch (ACT-01)
        # =========================================================================
        target_battery = next(
            (b for b in grid.batteries if b.busId == crit_bus_id),
            (grid.batteries[0] if grid.batteries else None)
        )
        b_name = target_battery.name if target_battery else "BESS Storage Unit"
        b_bus = target_battery.busId if target_battery else crit_bus_id

        if not target_battery:
            can_act1 = False
            reason_act1 = f"No battery storage unit installed on {grid.name}."
            act1_p_kw = 0.0
            act1_soc = soc_start
            viols_1 = base_violations
            v_crit_1 = base_v_crit
            f_crit_1 = base_f_crit_load
        else:
            bat_cap_kwh = max(10.0, float(target_battery.capacityKwh or battery_config.capacityKwh or 100.0))
            max_chg_spec = float(target_battery.maxChargeKw or battery_config.maxChargeKw or 40.0)
            max_dischg_spec = float(target_battery.maxDischargeKw or battery_config.maxDischargeKw or 40.0)

            if has_overvoltage:
                bat_dir = -1.0
            elif has_undervoltage:
                bat_dir = +1.0
            elif has_tx_overload and not (has_overvoltage or has_undervoltage):
                bat_dir = -1.0 if peak_solar_kw > peak_load_kw else +1.0
            elif has_feeder_overload and not (has_overvoltage or has_undervoltage):
                bat_dir = -1.0 if peak_solar_kw > peak_load_kw else +1.0
            else:
                bat_dir = +1.0

            if bat_dir < 0:
                if soc_start >= 95.0:
                    can_act1 = False
                    reason_act1 = f"Battery SOC too high ({soc_start:.0f}% >= 95% charge limit). Cannot absorb surplus power on {grid.name}."
                    p_upper = 0.0
                else:
                    headroom_pct = 95.0 - soc_start
                    headroom_kwh = (headroom_pct / 100.0) * bat_cap_kwh
                    p_headroom_kw = headroom_kwh / (0.5 * 0.92)
                    p_upper = min(max_chg_spec, p_headroom_kw)
                    can_act1 = p_upper >= 1.0
                    reason_act1 = None if can_act1 else f"Insufficient battery headroom for charging ({p_upper:.1f} kW)."
            else:
                if soc_start <= 20.0:
                    can_act1 = False
                    reason_act1 = f"Battery SOC too low ({soc_start:.0f}% <= 20% safe reserve floor on {grid.name})."
                    p_upper = 0.0
                else:
                    reserve_pct = soc_start - 20.0
                    reserve_kwh = (reserve_pct / 100.0) * bat_cap_kwh
                    p_reserve_kw = (reserve_kwh * 0.92) / 0.5
                    p_upper = min(max_dischg_spec, p_reserve_kw)
                    can_act1 = p_upper >= 1.0
                    reason_act1 = None if can_act1 else f"Insufficient battery reserve for discharging ({p_upper:.1f} kW)."

            if can_act1 and p_upper >= 1.0:
                def eval_bat_step(disp_kw: float):
                    g_eval = copy.deepcopy(grid)
                    pf = PowerFlowEngine(is_alternative_topology=False)
                    buses, feeders, _, _ = pf.solve(
                        grid=g_eval,
                        solar_kw=peak_solar_kw,
                        load_kw=peak_load_kw,
                        battery_power_kw=disp_kw,
                        installed_solar_capacity_kw=installed_capacity_kw,
                    )
                    viols = ConstraintChecker.check_all(
                        buses, feeders, eval_time, limits,
                        transformer=g_eval.substation,
                        tx_loading_pct=getattr(pf, "last_tx_loading", None),
                        tx_flow_kva=getattr(pf, "last_tx_flow_kva", None),
                    )
                    return len(viols), buses, feeders, pf

                viols_boundary, _, _, _ = eval_bat_step(bat_dir * p_upper)
                if viols_boundary < base_violations:
                    low_p = 1.0
                    high_p = p_upper
                    best_p = p_upper
                    iter_p = 0
                    while (high_p - low_p > 1.0) and iter_p < 10:
                        iter_p += 1
                        mid_p = (low_p + high_p) / 2.0
                        v_mid, _, _, _ = eval_bat_step(bat_dir * mid_p)
                        if v_mid <= viols_boundary:
                            best_p = mid_p
                            high_p = mid_p
                        else:
                            low_p = mid_p
                    chosen_p_mag = best_p
                else:
                    chosen_p_mag = p_upper

                act1_p_kw = bat_dir * round(chosen_p_mag, 1)
                viols_1, buses_1, feeders_1, _ = eval_bat_step(act1_p_kw)
                v_crit_1 = next((b.voltage for b in buses_1 if b.id == crit_bus_id), base_v_crit)
                f_crit_1 = next((f.loadingPercent for f in feeders_1 if f.id == crit_feeder_id), base_f_crit_load)

                if act1_p_kw < 0:
                    e_kwh = abs(act1_p_kw) * 0.5 * 0.92
                    act1_soc = round(min(98.0, soc_start + (e_kwh / bat_cap_kwh) * 100.0), 1)
                else:
                    e_kwh = (act1_p_kw * 0.5) / 0.92
                    act1_soc = round(max(0.0, soc_start - (e_kwh / bat_cap_kwh) * 100.0), 1)
            else:
                act1_p_kw = 0.0
                act1_soc = soc_start
                viols_1 = base_violations
                v_crit_1 = base_v_crit
                f_crit_1 = base_f_crit_load

        actions.append(
            CorrectiveAction(
                id="ACT-01",
                type="battery_discharge",
                title=f"BESS Dispatch ({b_name})",
                description=f"Dispatch active storage at {b_bus} to mitigate deviations and branch flows on {grid.name}.",
                parameterDelta=f"{act1_p_kw:+.0f} kW (Charge)" if act1_p_kw < 0 else f"{act1_p_kw:+.0f} kW (Discharge)",
                durationMinutes=30,
                isFeasible=can_act1,
                infeasibleReason=reason_act1 if not can_act1 else None,
                expectedVoltagePu=v_crit_1,
                expectedFeederLoadPercent=f_crit_1,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=act1_soc,
                resolvedViolationsCount=max(0, base_violations - viols_1) if can_act1 else 0,
                remainingViolationsCount=viols_1,
                renewableUtilizationPercent=100.0,
                targetComponentId=b_bus,
                targetComponentName=b_name,
                gridId=grid.id,
                dispatchKw=round(act1_p_kw, 1),
                curtailmentKw=0.0,
                targetTopology="standard",
                controlDirection="charge" if act1_p_kw < 0 else ("discharge" if act1_p_kw > 0 else "idle"),
            )
        )

        # =========================================================================
        # 2. ACTION 2: Feeder Reconfiguration / Tie-Switching (ACT-02)
        # =========================================================================
        has_reconfigurable = any(f.isReconfigurableAlternate or not f.isSwitchClosed for f in grid.feeders)
        alt_feeder = next((f for f in grid.feeders if f.isReconfigurableAlternate or not f.isSwitchClosed), None)

        if has_reconfigurable and alt_feeder:
            can_act2 = True
            reason_act2 = None
            act2_title = f"Feeder Switching ({crit_feeder_id} → {alt_feeder.id})"
            act2_desc = f"Open tie switch on congested {crit_feeder_name} and close alternate branch to {alt_feeder.name} on {grid.name}."
            act2_param = f"Switch {crit_feeder_id} → {alt_feeder.id}"

            grid_eval_2 = copy.deepcopy(grid)
            pf_2 = PowerFlowEngine(is_alternative_topology=True)
            buses_2, feeders_2, _, _ = pf_2.solve(
                grid=grid_eval_2,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
            viols_2_list = ConstraintChecker.check_all(
                buses_2, feeders_2, eval_time, limits,
                transformer=grid_eval_2.substation,
                tx_loading_pct=getattr(pf_2, "last_tx_loading", None),
                tx_flow_kva=getattr(pf_2, "last_tx_flow_kva", None),
            )
            viols_2 = len(viols_2_list)
            v_crit_2 = next((b.voltage for b in buses_2 if b.id == crit_bus_id), base_v_crit)
            f_crit_2 = next((f.loadingPercent for f in feeders_2 if f.id == crit_feeder_id), base_f_crit_load)
            target_topology_2 = "alternative"
        else:
            can_act2 = False
            reason_act2 = f"Network topology on {grid.name} lacks an alternate reconfigurable feeder or tie-line switch."
            act2_title = "Feeder Reconfiguration (Unsupported)"
            act2_desc = f"Cannot reconfigure topology: {grid.name} has no available alternative tie-line switches."
            act2_param = "No Alternate Feeder"
            v_crit_2 = base_v_crit
            f_crit_2 = base_f_crit_load
            viols_2 = base_violations
            target_topology_2 = "standard"

        actions.append(
            CorrectiveAction(
                id="ACT-02",
                type="feeder_reconfiguration",
                title=act2_title,
                description=act2_desc,
                parameterDelta=act2_param,
                durationMinutes=60,
                isFeasible=can_act2,
                infeasibleReason=reason_act2 if not can_act2 else None,
                expectedVoltagePu=v_crit_2,
                expectedFeederLoadPercent=f_crit_2,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=soc_start,
                resolvedViolationsCount=max(0, base_violations - viols_2) if can_act2 else 0,
                remainingViolationsCount=viols_2,
                renewableUtilizationPercent=100.0,
                targetComponentId=crit_feeder_id,
                targetComponentName=crit_feeder_name,
                gridId=grid.id,
                dispatchKw=0.0,
                curtailmentKw=0.0,
                targetTopology=target_topology_2,
                controlDirection="reconfigure",
            )
        )

        # =========================================================================
        # 3. ACTION 3: Bounded Active-Power Solar Curtailment (ACT-03)
        # =========================================================================
        target_solar = next(
            (s for s in grid.solarUnits if s.busId == crit_bus_id),
            (grid.solarUnits[0] if grid.solarUnits else None)
        )
        s_name = target_solar.name if target_solar else "Solar Farm"
        s_bus = target_solar.busId if target_solar else crit_bus_id

        is_pure_undervoltage = has_undervoltage and not (has_overvoltage or has_feeder_overload or has_tx_overload)

        if is_pure_undervoltage:
            can_act3 = False
            reason_act3 = "Inapplicable: Solar curtailment reduces local generation and cannot resolve low-voltage demand deficits."
            curtail_amount = 0.0
            v_crit_3 = base_v_crit
            f_crit_3 = base_f_crit_load
            viols_3 = base_violations
            curtailed_used = peak_solar_kw
            utilization_3 = 100.0
        elif not target_solar or peak_solar_kw <= 0.0:
            can_act3 = False
            reason_act3 = f"No active solar generation available to curtail on {grid.name} at {eval_time}."
            curtail_amount = 0.0
            v_crit_3 = base_v_crit
            f_crit_3 = base_f_crit_load
            viols_3 = base_violations
            curtailed_used = peak_solar_kw
            utilization_3 = 100.0
        else:
            can_act3 = True
            reason_act3 = None

            def eval_curtail_step(curt_kw: float):
                g_eval = copy.deepcopy(grid)
                pf = PowerFlowEngine(is_alternative_topology=False)
                buses, feeders, _, _ = pf.solve(
                    grid=g_eval,
                    solar_kw=peak_solar_kw,
                    load_kw=peak_load_kw,
                    solar_curtailment_kw=curt_kw,
                    installed_solar_capacity_kw=installed_capacity_kw,
                )
                viols = ConstraintChecker.check_all(
                    buses, feeders, eval_time, limits,
                    transformer=g_eval.substation,
                    tx_loading_pct=getattr(pf, "last_tx_loading", None),
                    tx_flow_kva=getattr(pf, "last_tx_flow_kva", None),
                )
                return len(viols), buses, feeders, pf

            c_max = peak_solar_kw
            viols_boundary_c, _, _, _ = eval_curtail_step(c_max)

            if viols_boundary_c < base_violations:
                low_c = 0.0
                high_c = c_max
                best_c = c_max
                iter_c = 0
                while (high_c - low_c > 1.0) and iter_c < 12:
                    iter_c += 1
                    mid_c = (low_c + high_c) / 2.0
                    v_mid, _, _, _ = eval_curtail_step(mid_c)
                    if v_mid <= viols_boundary_c:
                        best_c = mid_c
                        high_c = mid_c
                    else:
                        low_c = mid_c
                curtail_amount = round(best_c, 1)
            else:
                curtail_amount = min(peak_solar_kw, 50.0)

            viols_3, buses_3, feeders_3, _ = eval_curtail_step(curtail_amount)
            v_crit_3 = next((b.voltage for b in buses_3 if b.id == crit_bus_id), base_v_crit)
            f_crit_3 = next((f.loadingPercent for f in feeders_3 if f.id == crit_feeder_id), base_f_crit_load)
            curtailed_used = max(0.0, peak_solar_kw - curtail_amount)
            utilization_3 = round((curtailed_used / peak_solar_kw) * 100.0, 1) if peak_solar_kw > 0 else 100.0

        actions.append(
            CorrectiveAction(
                id="ACT-03",
                type="solar_curtailment",
                title=f"Solar Curtailment ({s_name})",
                description=f"Curtail active PV generation by {curtail_amount:.0f} kW at {s_bus} to relieve local constraints on {grid.name}.",
                parameterDelta=f"-{curtail_amount:.0f} kW (Curtailed)",
                durationMinutes=45,
                isFeasible=can_act3,
                infeasibleReason=reason_act3 if not can_act3 else None,
                expectedVoltagePu=v_crit_3,
                expectedFeederLoadPercent=f_crit_3,
                solarUsedKw=curtailed_used,
                batterySocPercent=soc_start,
                resolvedViolationsCount=max(0, base_violations - viols_3) if can_act3 else 0,
                remainingViolationsCount=viols_3,
                renewableUtilizationPercent=utilization_3,
                targetComponentId=s_bus,
                targetComponentName=s_name,
                gridId=grid.id,
                dispatchKw=0.0,
                curtailmentKw=round(curtail_amount, 1),
                targetTopology="standard",
                controlDirection="curtail",
            )
        )

        # =========================================================================
        # 4. ACTION 4: High-Rate Reserve Battery Discharge (Boundary Test - ACT-04)
        # =========================================================================
        can_act4, reason_act4 = b_engine.can_discharge(80.0, duration_hours=0.25)
        if soc_start <= 20.0 or not can_act4:
            can_act4 = False
            reason_act4 = (
                f"Requested discharge exceeds available BESS reserve. "
                f"Battery SOC too low ({soc_start:.0f}% <= 20% safe reserve floor on {grid.name})."
            )

        grid_eval_4 = copy.deepcopy(grid)
        pf_4 = PowerFlowEngine(is_alternative_topology=False)
        buses_4, feeders_4, _, _ = pf_4.solve(
            grid=grid_eval_4,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            battery_power_kw=80.0 if can_act4 else 0.0,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
        viols_4_list = ConstraintChecker.check_all(
            buses_4, feeders_4, eval_time, limits,
            transformer=grid_eval_4.substation,
            tx_loading_pct=getattr(pf_4, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_4, "last_tx_flow_kva", None),
        )
        viols_4 = len(viols_4_list) if can_act4 else base_violations
        v_crit_4 = next((b.voltage for b in buses_4 if b.id == crit_bus_id), base_v_crit) if can_act4 else base_v_crit
        f_crit_4 = next((f.loadingPercent for f in feeders_4 if f.id == crit_feeder_id), base_f_crit_load) if can_act4 else base_f_crit_load

        actions.append(
            CorrectiveAction(
                id="ACT-04",
                type="max_battery_discharge",
                title=f"Forced Deep Discharge ({b_name})",
                description=f"High-rate discharge (+80 kW) beyond warranty depth-of-discharge threshold on {grid.name}.",
                parameterDelta="-80 kW (Deep)",
                durationMinutes=15,
                isFeasible=can_act4,
                infeasibleReason=reason_act4 if not can_act4 else None,
                expectedVoltagePu=v_crit_4,
                expectedFeederLoadPercent=f_crit_4,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=15.0 if can_act4 else soc_start,
                resolvedViolationsCount=max(0, base_violations - viols_4) if can_act4 else 0,
                remainingViolationsCount=viols_4,
                renewableUtilizationPercent=100.0,
                targetComponentId=b_bus,
                targetComponentName=b_name,
                gridId=grid.id,
                dispatchKw=80.0 if can_act4 else 0.0,
                curtailmentKw=0.0,
                targetTopology="standard",
                controlDirection="discharge",
            )
        )

        # =========================================================================
        # 5. Full-Horizon Safety Verification on Top Single Actions
        # =========================================================================
        for a in actions:
            is_h_safe, h_viols, rej_reason = ActionEngine.verify_full_horizon_safety(
                candidate=a,
                grid=grid,
                input_data=input_data,
                all_times=all_times,
                solar_times=solar_times,
                load_times=load_times,
                eval_time=eval_time,
                limits=limits,
            )
            a.fullHorizonSafe = is_h_safe
            a.horizonViolationsCount = h_viols
            if not is_h_safe and rej_reason:
                a.selectionReason = rej_reason

        # =========================================================================
        # 6. Hybrid Candidate Plan Generation (Stage 2 & 3)
        # =========================================================================
        hybrid_plan = ActionEngine.evaluate_hybrid_candidate(
            grid=grid,
            peak_solar_kw=peak_solar_kw,
            peak_load_kw=peak_load_kw,
            installed_capacity_kw=installed_capacity_kw,
            battery_config=battery_config,
            soc_start=soc_start,
            limits=limits,
            eval_time=eval_time,
            base_violations=base_violations,
            base_v_crit=base_v_crit,
            base_f_crit_load=base_f_crit_load,
            crit_bus_id=crit_bus_id,
            crit_feeder_id=crit_feeder_id,
            has_overvoltage=has_overvoltage,
            has_undervoltage=has_undervoltage,
            has_feeder_overload=has_feeder_overload,
            has_tx_overload=has_tx_overload,
            act1_single=actions[0],
            act2_single=actions[1],
            act3_single=actions[2],
        )

        if hybrid_plan:
            is_h_safe, h_viols, rej_reason = ActionEngine.verify_full_horizon_safety(
                candidate=hybrid_plan,
                grid=grid,
                input_data=input_data,
                all_times=all_times,
                solar_times=solar_times,
                load_times=load_times,
                eval_time=eval_time,
                limits=limits,
            )
            hybrid_plan.fullHorizonSafe = is_h_safe
            hybrid_plan.horizonViolationsCount = h_viols
            if not is_h_safe and rej_reason:
                hybrid_plan.selectionReason = rej_reason

        ActionEngine.last_evaluated_hybrid_plan = hybrid_plan

        # =========================================================================
        # 7. Transparent Hierarchical Safety-First Candidate Ranking
        # =========================================================================
        def rank_action_key(a: CorrectiveAction) -> Tuple:
            """
            Multi-criteria lexicographic comparison key. Lower tuple is better (min):
            1. Feasible outranks Infeasible (0 vs 1)
            2. Full-horizon safe outranks horizon-unsafe (0 vs 1)
            3. Remaining violations count at worst timestep (lower is better)
            4. Total horizon violations count
            5. New violations penalty (penalize worsening conditions)
            6. Voltage and loading safety margins (penalize close-to-boundary operation)
            7. Negated renewable utilization (-utilization so higher utilization ranks better)
            8. Minimal intervention stress (lower dispatch/curtailment preferred if equally safe)
            9. Action type tie-breaker
            """
            if not a.isFeasible:
                return (1, 1, 999, 9999, 999.0, 999.0, 0.0, 999.0, 9)

            feas_flag = 0
            horizon_flag = 0 if (a.fullHorizonSafe is not False) else 1
            rem_viols = a.remainingViolationsCount
            horiz_viols = a.horizonViolationsCount if a.horizonViolationsCount is not None else rem_viols

            # Penalize any candidate that introduces new violations beyond baseline
            new_viol_penalty = max(0, rem_viols - base_violations) * 20.0

            # Proximity-to-limits safety margins (only penalize exceeding limits or new violations)
            v_dev = max(0.0, a.expectedVoltagePu - v_max) * 50.0 + max(0.0, v_min - a.expectedVoltagePu) * 50.0
            f_dev = max(0.0, a.expectedFeederLoadPercent - feeder_max) * 2.0
            safety_penalty = round(v_dev + f_dev + new_viol_penalty, 3)

            neg_util = -round(a.renewableUtilizationPercent, 1)
            stress = round((a.curtailmentKw or 0.0) * 0.2 + abs(a.dispatchKw or 0.0) * 0.05, 2)

            type_preference = {
                "hybrid_plan": 0,
                "feeder_reconfiguration": 1,
                "battery_discharge": 2,
                "solar_curtailment": 3,
                "max_battery_discharge": 4,
            }.get(a.type, 9)

            return (feas_flag, horizon_flag, rem_viols, horiz_viols, safety_penalty, neg_util, stress, type_preference)

        all_candidates_for_ranking = list(actions)
        if hybrid_plan and include_hybrid:
            all_candidates_for_ranking.append(hybrid_plan)

        ranked_actions = sorted(all_candidates_for_ranking, key=rank_action_key)
        best_candidate = ranked_actions[0]
        recommended_id = best_candidate.id

        rec_act = best_candidate
        is_safe = rec_act.isFeasible and rec_act.remainingViolationsCount == 0

        comparison_data = BeforeAfterComparisonData(
            b3Voltage=BeforeAfterComparisonPoint(
                before=base_v_crit,
                after=rec_act.expectedVoltagePu,
                limit=v_max,
                status="safe" if rec_act.expectedVoltagePu <= v_max else "violation",
            ),
            f02Loading=BeforeAfterComparisonPoint(
                before=base_f_crit_load,
                after=rec_act.expectedFeederLoadPercent,
                limit=feeder_max,
                status="safe" if rec_act.expectedFeederLoadPercent <= feeder_max else "violation",
            ),
            solarUsed=BeforeAfterSolarUsed(
                before=peak_solar_kw,
                after=rec_act.solarUsedKw,
                capacity=installed_capacity_kw,
            ),
            batterySoc=BeforeAfterBatterySoc(
                before=soc_start,
                after=rec_act.batterySocPercent,
            ),
            isSafe=is_safe,
            renewableUseMaintainedPercent=rec_act.renewableUtilizationPercent,
            selectedActionTitle=rec_act.title,
            monitoredBusId=crit_bus_id,
            monitoredBusName=crit_bus_name,
            monitoredFeederId=crit_feeder_id,
            monitoredFeederName=crit_feeder_name,
            beforeViolationsCount=base_violations,
            afterViolationsCount=rec_act.remainingViolationsCount,
            gridId=grid.id,
            gridName=grid.name,
        )

        return all_candidates_for_ranking, recommended_id, comparison_data

    @classmethod
    def evaluate_hybrid_candidate(
        cls,
        grid: GridNetwork,
        peak_solar_kw: float,
        peak_load_kw: float,
        installed_capacity_kw: float,
        battery_config: BatteryStorageConfig,
        soc_start: float,
        limits: NetworkLimitsConfig,
        eval_time: str,
        base_violations: int,
        base_v_crit: float,
        base_f_crit_load: float,
        crit_bus_id: str,
        crit_feeder_id: str,
        has_overvoltage: bool,
        has_undervoltage: bool,
        has_feeder_overload: bool,
        has_tx_overload: bool,
        act1_single: CorrectiveAction,
        act2_single: CorrectiveAction,
        act3_single: CorrectiveAction,
    ) -> Optional[CorrectiveAction]:
        """
        Formulates and evaluates a candidate compound action plan using joint magnitude search.
        Evaluates:
        1. Battery charging + solar curtailment (excess solar / overvoltage / reverse flow).
        2. Feeder reconfiguration + battery discharge (feeder overload / demand deficit).
        Enforces maximum solver call budget (<= 20 evaluations).
        """
        target_battery = next(
            (b for b in grid.batteries if b.busId == crit_bus_id),
            (grid.batteries[0] if grid.batteries else None)
        )
        target_solar = next(
            (s for s in grid.solarUnits if s.busId == crit_bus_id),
            (grid.solarUnits[0] if grid.solarUnits else None)
        )
        has_reconfigurable = any(f.isReconfigurableAlternate or not f.isSwitchClosed for f in grid.feeders)
        alt_feeder = next((f for f in grid.feeders if f.isReconfigurableAlternate or not f.isSwitchClosed), None)

        is_solar_surplus = has_overvoltage or (has_tx_overload and peak_solar_kw > peak_load_kw) or (has_feeder_overload and peak_solar_kw > peak_load_kw)
        is_demand_or_congestion = has_undervoltage or has_feeder_overload

        # -------------------------------------------------------------------------
        # Case A: Battery Charging + Solar Curtailment (Surplus / Overvoltage)
        # -------------------------------------------------------------------------
        if is_solar_surplus and target_battery and target_solar and peak_solar_kw > 0.0:
            if soc_start >= 95.0:
                return CorrectiveAction(
                    id="PLAN-HYBRID-01",
                    type="hybrid_plan",
                    title="Hybrid Plan (BESS + Curtailment - Infeasible)",
                    description=f"Cannot formulate hybrid absorption: battery SOC too high ({soc_start:.0f}% >= 95% ceiling).",
                    parameterDelta="Infeasible",
                    isFeasible=False,
                    infeasibleReason=f"Battery SOC too high ({soc_start:.0f}% >= 95% charge ceiling). Cannot participate in hybrid absorption.",
                    expectedVoltagePu=base_v_crit,
                    expectedFeederLoadPercent=base_f_crit_load,
                    solarUsedKw=peak_solar_kw,
                    batterySocPercent=soc_start,
                    resolvedViolationsCount=0,
                    remainingViolationsCount=base_violations,
                    renewableUtilizationPercent=100.0,
                    gridId=grid.id,
                    isHybrid=True,
                    constituentActions=["battery_discharge", "solar_curtailment"],
                )

            bat_cap = max(10.0, float(target_battery.capacityKwh or battery_config.capacityKwh or 100.0))
            max_chg_spec = min(
                float(target_battery.maxChargeKw or 40.0),
                float(battery_config.maxChargeKw or 40.0),
            )
            headroom_pct = 95.0 - soc_start
            p_headroom = (headroom_pct / 100.0) * bat_cap / (0.5 * 0.92)
            p_chg_max = min(max_chg_spec, p_headroom)

            if p_chg_max < 1.0:
                return CorrectiveAction(
                    id="PLAN-HYBRID-01",
                    type="hybrid_plan",
                    title="Hybrid Plan (BESS + Curtailment - Infeasible)",
                    description="Insufficient battery charging headroom to participate in hybrid absorption.",
                    parameterDelta="Infeasible",
                    isFeasible=False,
                    infeasibleReason="Insufficient battery headroom for charging.",
                    expectedVoltagePu=base_v_crit,
                    expectedFeederLoadPercent=base_f_crit_load,
                    solarUsedKw=peak_solar_kw,
                    batterySocPercent=soc_start,
                    resolvedViolationsCount=0,
                    remainingViolationsCount=base_violations,
                    renewableUtilizationPercent=100.0,
                    gridId=grid.id,
                    isHybrid=True,
                    constituentActions=["battery_discharge", "solar_curtailment"],
                )

            # Solver evaluation helper
            def eval_joint(p_bat: float, c_kw: float):
                g_eval = copy.deepcopy(grid)
                pf = PowerFlowEngine(is_alternative_topology=False)
                buses, feeders, _, _ = pf.solve(
                    grid=g_eval,
                    solar_kw=peak_solar_kw,
                    load_kw=peak_load_kw,
                    battery_power_kw=p_bat,
                    solar_curtailment_kw=c_kw,
                    installed_solar_capacity_kw=installed_capacity_kw,
                )
                viols = ConstraintChecker.check_all(
                    buses, feeders, eval_time, limits,
                    transformer=g_eval.substation,
                    tx_loading_pct=getattr(pf, "last_tx_loading", None),
                    tx_flow_kva=getattr(pf, "last_tx_flow_kva", None),
                )
                return len(viols), buses, feeders, pf

            # 1. Test full battery absorption (-p_chg_max) with 0 curtailment:
            v_chg_only, _, _, _ = eval_joint(-p_chg_max, 0.0)
            if v_chg_only == 0:
                # Battery charge alone solves all violations! Minimal curtailment = 0.
                best_p = -p_chg_max
                best_c = 0.0
                # Bisect charge magnitude to avoid over-dispatch:
                low_p = 1.0
                high_p = p_chg_max
                while (high_p - low_p > 1.0):
                    mid_p = (low_p + high_p) / 2.0
                    v_m, _, _, _ = eval_joint(-mid_p, 0.0)
                    if v_m == 0:
                        best_p = -mid_p
                        high_p = mid_p
                    else:
                        low_p = mid_p
            else:
                # Battery charge alone leaves violations. Apply full charging and bisect minimal curtailment:
                best_p = -p_chg_max
                v_bound, _, _, _ = eval_joint(-p_chg_max, peak_solar_kw)
                if v_bound < base_violations:
                    low_c = 0.0
                    high_c = peak_solar_kw
                    best_c = peak_solar_kw
                    iter_c = 0
                    while (high_c - low_c > 1.0) and iter_c < 10:
                        iter_c += 1
                        mid_c = (low_c + high_c) / 2.0
                        v_m, _, _, _ = eval_joint(-p_chg_max, mid_c)
                        if v_m <= v_bound:
                            best_c = mid_c
                            high_c = mid_c
                        else:
                            low_c = mid_c
                else:
                    best_c = min(peak_solar_kw, 50.0)

            viols_h, buses_h, feeders_h, _ = eval_joint(best_p, best_c)
            v_crit_h = next((b.voltage for b in buses_h if b.id == crit_bus_id), base_v_crit)
            f_crit_h = next((f.loadingPercent for f in feeders_h if f.id == crit_feeder_id), base_f_crit_load)
            curtailed_used_h = max(0.0, peak_solar_kw - best_c)
            util_h = round((curtailed_used_h / peak_solar_kw) * 100.0, 1) if peak_solar_kw > 0 else 100.0
            e_kwh = abs(best_p) * 0.5 * 0.92
            soc_end_h = round(min(98.0, soc_start + (e_kwh / bat_cap) * 100.0), 1)

            return CorrectiveAction(
                id="PLAN-HYBRID-01",
                type="hybrid_plan",
                title="Hybrid Plan (BESS Absorption + Solar Curtailment)",
                description=(
                    f"Coordinated {abs(best_p):.0f} kW BESS absorption with {best_c:.0f} kW supplemental curtailment on {grid.name}. "
                    f"Eliminates local voltage deviations while conserving {curtailed_used_h:.0f} kW clean renewable power."
                ),
                parameterDelta=f"{best_p:+.0f} kW BESS / -{best_c:.0f} kW Solar",
                durationMinutes=30,
                isFeasible=True,
                expectedVoltagePu=v_crit_h,
                expectedFeederLoadPercent=f_crit_h,
                solarUsedKw=curtailed_used_h,
                batterySocPercent=soc_end_h,
                resolvedViolationsCount=max(0, base_violations - viols_h),
                remainingViolationsCount=viols_h,
                renewableUtilizationPercent=util_h,
                targetComponentId=crit_bus_id,
                targetComponentName=f"{target_battery.name} + {target_solar.name}",
                gridId=grid.id,
                dispatchKw=round(best_p, 1),
                curtailmentKw=round(best_c, 1),
                targetTopology="standard",
                controlDirection="charge",
                isHybrid=True,
                constituentActions=["battery_discharge", "solar_curtailment"],
            )

        # -------------------------------------------------------------------------
        # Case B: Feeder Switching + Battery Discharge (Congestion / Demand Deficit)
        # -------------------------------------------------------------------------
        if is_demand_or_congestion and has_reconfigurable and alt_feeder and target_battery:
            if soc_start <= 20.0:
                return CorrectiveAction(
                    id="PLAN-HYBRID-01",
                    type="hybrid_plan",
                    title="Hybrid Plan (Switching + BESS - Infeasible)",
                    description=f"Battery SOC too low ({soc_start:.0f}% <= 20% safe reserve floor). Cannot inject power in hybrid plan.",
                    parameterDelta="Infeasible",
                    isFeasible=False,
                    infeasibleReason=f"Battery SOC too low ({soc_start:.0f}% <= 20% safe reserve floor). Cannot inject power.",
                    expectedVoltagePu=base_v_crit,
                    expectedFeederLoadPercent=base_f_crit_load,
                    solarUsedKw=peak_solar_kw,
                    batterySocPercent=soc_start,
                    resolvedViolationsCount=0,
                    remainingViolationsCount=base_violations,
                    renewableUtilizationPercent=100.0,
                    gridId=grid.id,
                    isHybrid=True,
                    constituentActions=["feeder_reconfiguration", "battery_discharge"],
                )

            bat_cap = max(10.0, float(target_battery.capacityKwh or battery_config.capacityKwh or 100.0))
            max_dischg_spec = min(
                float(target_battery.maxDischargeKw or 40.0),
                float(battery_config.maxDischargeKw or 40.0),
            )
            reserve_pct = soc_start - 20.0
            p_reserve = (reserve_pct / 100.0) * bat_cap * 0.92 / 0.5
            p_dischg_max = min(max_dischg_spec, p_reserve)

            if p_dischg_max < 1.0:
                return CorrectiveAction(
                    id="PLAN-HYBRID-01",
                    type="hybrid_plan",
                    title="Hybrid Plan (Switching + BESS - Infeasible)",
                    description="Insufficient battery reserve for discharging.",
                    parameterDelta="Infeasible",
                    isFeasible=False,
                    infeasibleReason="Insufficient battery reserve for discharging.",
                    expectedVoltagePu=base_v_crit,
                    expectedFeederLoadPercent=base_f_crit_load,
                    solarUsedKw=peak_solar_kw,
                    batterySocPercent=soc_start,
                    resolvedViolationsCount=0,
                    remainingViolationsCount=base_violations,
                    renewableUtilizationPercent=100.0,
                    gridId=grid.id,
                    isHybrid=True,
                    constituentActions=["feeder_reconfiguration", "battery_discharge"],
                )

            def eval_joint_alt(p_disp: float):
                g_eval = copy.deepcopy(grid)
                pf = PowerFlowEngine(is_alternative_topology=True)
                buses, feeders, _, _ = pf.solve(
                    grid=g_eval,
                    solar_kw=peak_solar_kw,
                    load_kw=peak_load_kw,
                    battery_power_kw=p_disp,
                    installed_solar_capacity_kw=installed_capacity_kw,
                )
                viols = ConstraintChecker.check_all(
                    buses, feeders, eval_time, limits,
                    transformer=g_eval.substation,
                    tx_loading_pct=getattr(pf, "last_tx_loading", None),
                    tx_flow_kva=getattr(pf, "last_tx_flow_kva", None),
                )
                return len(viols), buses, feeders, pf

            v_alt_only, _, _, _ = eval_joint_alt(0.0)
            if v_alt_only == 0:
                best_disp = 0.0
            else:
                v_bound_alt, _, _, _ = eval_joint_alt(p_dischg_max)
                if v_bound_alt < v_alt_only:
                    low_d = 1.0
                    high_d = p_dischg_max
                    best_disp = p_dischg_max
                    iter_d = 0
                    while (high_d - low_d > 1.0) and iter_d < 8:
                        iter_d += 1
                        mid_d = (low_d + high_d) / 2.0
                        v_m, _, _, _ = eval_joint_alt(mid_d)
                        if v_m <= v_bound_alt:
                            best_disp = mid_d
                            high_d = mid_d
                        else:
                            low_d = mid_d
                else:
                    best_disp = p_dischg_max

            viols_h, buses_h, feeders_h, _ = eval_joint_alt(best_disp)
            v_crit_h = next((b.voltage for b in buses_h if b.id == crit_bus_id), base_v_crit)
            f_crit_h = next((f.loadingPercent for f in feeders_h if f.id == crit_feeder_id), base_f_crit_load)
            e_kwh = (best_disp * 0.5) / 0.92
            soc_end_h = round(max(0.0, soc_start - (e_kwh / bat_cap) * 100.0), 1)

            return CorrectiveAction(
                id="PLAN-HYBRID-01",
                type="hybrid_plan",
                title="Hybrid Plan (Feeder Switching + BESS Discharge)",
                description=(
                    f"Coordinated tie-switching ({crit_feeder_id} \u2192 {alt_feeder.id}) with {best_disp:+.0f} kW BESS injection on {grid.name}."
                ),
                parameterDelta=f"Switch {crit_feeder_id}\u2192{alt_feeder.id} / {best_disp:+.0f} kW BESS",
                durationMinutes=60,
                isFeasible=True,
                expectedVoltagePu=v_crit_h,
                expectedFeederLoadPercent=f_crit_h,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=soc_end_h,
                resolvedViolationsCount=max(0, base_violations - viols_h),
                remainingViolationsCount=viols_h,
                renewableUtilizationPercent=100.0,
                targetComponentId=crit_feeder_id,
                targetComponentName=f"{alt_feeder.name} + {target_battery.name}",
                gridId=grid.id,
                dispatchKw=round(best_disp, 1),
                curtailmentKw=0.0,
                targetTopology="alternative",
                controlDirection="discharge",
                isHybrid=True,
                constituentActions=["feeder_reconfiguration", "battery_discharge"],
            )

        # Unsupported fallback
        return CorrectiveAction(
            id="PLAN-HYBRID-01",
            type="hybrid_plan",
            title="Hybrid Plan (Unsupported)",
            description=f"No compatible multi-action combination supported for current grid constraints on {grid.name}.",
            parameterDelta="Unsupported",
            isFeasible=False,
            infeasibleReason="No compatible multi-action combination supported for current grid constraints.",
            expectedVoltagePu=base_v_crit,
            expectedFeederLoadPercent=base_f_crit_load,
            solarUsedKw=peak_solar_kw,
            batterySocPercent=soc_start,
            resolvedViolationsCount=0,
            remainingViolationsCount=base_violations,
            renewableUtilizationPercent=100.0,
            gridId=grid.id,
            isHybrid=True,
            constituentActions=[],
        )

    @classmethod
    def verify_full_horizon_safety(
        cls,
        candidate: CorrectiveAction,
        grid: GridNetwork,
        input_data: Optional[SimulationInput] = None,
        all_times: Optional[List[str]] = None,
        solar_times: Optional[Dict[str, float]] = None,
        load_times: Optional[Dict[str, float]] = None,
        eval_time: str = "13:15",
        limits: Optional[NetworkLimitsConfig] = None,
    ) -> Tuple[bool, int, Optional[str]]:
        """
        Evaluates the plan across all 96 simulation timesteps to verify full-horizon safety.
        Returns:
            (is_horizon_safe, total_horizon_violations, rejection_reason)
        """
        if not candidate.isFeasible:
            return False, 999, candidate.infeasibleReason or "Infeasible action"

        if not all_times or not solar_times or not load_times or not input_data:
            return True, candidate.remainingViolationsCount, None

        if limits is None:
            limits = input_data.networkConfig

        try:
            eval_idx = all_times.index(eval_time)
        except ValueError:
            eval_idx = len(all_times) // 2

        step_minutes = 15 if len(all_times) >= 48 else 60
        duration_mins = float(candidate.durationMinutes or 30)
        active_window_size = max(1, round(duration_mins / step_minutes))
        active_indices = set(range(eval_idx, min(len(all_times), eval_idx + active_window_size)))

        horizon_violations = 0
        new_violations = 0
        first_breach_time = None

        curr_soc = float(input_data.batteryConfig.initialSocPercent)
        b_cap = max(10.0, float(input_data.batteryConfig.capacityKwh))

        p_disp = candidate.dispatchKw or 0.0
        c_curt = candidate.curtailmentKw or 0.0
        use_alt = (candidate.targetTopology == "alternative")

        pf_normal = PowerFlowEngine(is_alternative_topology=False)
        pf_alt = PowerFlowEngine(is_alternative_topology=True)

        for idx, t in enumerate(all_times):
            s_kw = solar_times.get(t, input_data.currentSolarKw)
            l_kw = load_times.get(t, input_data.currentLoadKw)

            is_active = (idx in active_indices)
            step_disp = p_disp if is_active else 0.0
            step_curt = c_curt if is_active else 0.0
            step_alt = use_alt if is_active else False

            if is_active and step_disp != 0:
                dt = step_minutes / 60.0
                if step_disp < 0:
                    delta_soc = ((abs(step_disp) * dt * 0.92) / b_cap) * 100.0
                    curr_soc = curr_soc + delta_soc
                else:
                    delta_soc = ((step_disp * dt / 0.92) / b_cap) * 100.0
                    curr_soc = curr_soc - delta_soc

                if curr_soc > 98.0 or curr_soc < 15.0:
                    return False, 999, f"Action breaches battery reserve limits during operation (SOC reached {curr_soc:.1f}% at {t})."

            pf_engine = pf_alt if step_alt else pf_normal
            buses, feeders, _, tx_loading = pf_engine.solve(
                grid=grid,
                solar_kw=s_kw,
                load_kw=l_kw,
                battery_power_kw=step_disp,
                solar_curtailment_kw=step_curt,
                installed_solar_capacity_kw=input_data.installedSolarCapacityKw,
            )

            step_viols = ConstraintChecker.check_all(
                buses, feeders, t, limits,
                transformer=grid.substation,
                tx_loading_pct=tx_loading,
                tx_flow_kva=getattr(pf_engine, "last_tx_flow_kva", None),
            )
            horizon_violations += len(step_viols)

            # Check baseline at this step to see if step_viols created a NEW critical violation
            buses_b, feeders_b, _, tx_b = pf_normal.solve(
                grid=grid,
                solar_kw=s_kw,
                load_kw=l_kw,
                installed_solar_capacity_kw=input_data.installedSolarCapacityKw,
            )
            base_viols_step = ConstraintChecker.check_all(
                buses_b, feeders_b, t, limits,
                transformer=grid.substation,
                tx_loading_pct=tx_b,
                tx_flow_kva=getattr(pf_normal, "last_tx_flow_kva", None),
            )

            crit_now = [v for v in step_viols if v.severity == ViolationSeverity.CRITICAL]
            crit_base = [v for v in base_viols_step if v.severity == ViolationSeverity.CRITICAL]
            if len(crit_now) > len(crit_base) and idx not in active_indices:
                new_violations += (len(crit_now) - len(crit_base))
                if first_breach_time is None:
                    first_breach_time = t

        if new_violations > 0:
            return False, horizon_violations, f"Action creates {new_violations} new critical violations at subsequent timesteps (e.g. at {first_breach_time})."

        return True, horizon_violations, None

    @staticmethod
    def apply_action_physics(
        action: CorrectiveAction,
        grid: GridNetwork,
        peak_solar_kw: float,
        peak_load_kw: float,
        installed_capacity_kw: float = 250.0,
    ) -> Tuple[PowerFlowEngine, List[Bus], List[Feeder]]:
        """
        Applies action control semantics to an isolated copy of grid and runs the genuine solver.
        Consumes explicit numerical fields first, with fallback to legacy parameter parsing.
        Supports hybrid_plan compound physics recalculation.
        """
        eval_grid = copy.deepcopy(grid)

        if action.type == "hybrid_plan":
            p_kw = (action.dispatchKw if action.isFeasible else 0.0) or 0.0
            curtail_kw = (action.curtailmentKw if action.isFeasible else 0.0) or 0.0
            is_alt = (action.targetTopology == "alternative")
            pf = PowerFlowEngine(is_alternative_topology=is_alt)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                battery_power_kw=p_kw,
                solar_curtailment_kw=curtail_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "battery_discharge":
            if action.dispatchKw is not None:
                p_kw = action.dispatchKw if action.isFeasible else 0.0
            else:
                p_kw = -40.0 if "Charge" in (action.parameterDelta or "") else 40.0
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                battery_power_kw=p_kw if action.isFeasible else 0.0,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "feeder_reconfiguration":
            is_alt = (action.targetTopology == "alternative") if action.targetTopology is not None else True
            pf = PowerFlowEngine(is_alternative_topology=is_alt)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "solar_curtailment":
            if action.curtailmentKw is not None:
                curtail_kw = action.curtailmentKw if action.isFeasible else 0.0
            else:
                curtail_kw = max(0.0, peak_solar_kw - action.solarUsedKw) if action.isFeasible else 0.0
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                solar_curtailment_kw=curtail_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "max_battery_discharge":
            if action.dispatchKw is not None:
                p_kw = action.dispatchKw if action.isFeasible else 0.0
            else:
                p_kw = 80.0 if action.isFeasible else 0.0
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                battery_power_kw=p_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        else:
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )

        return pf, buses, feeders
