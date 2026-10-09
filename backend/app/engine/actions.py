import copy
import math
from typing import List, Tuple, Optional
from app.schemas.action import CorrectiveAction
from app.schemas.battery import BatteryStorageConfig
from app.schemas.simulation import (
    BeforeAfterComparisonData,
    BeforeAfterComparisonPoint,
    BeforeAfterSolarUsed,
    BeforeAfterBatterySoc,
    NetworkLimitsConfig,
)
from app.schemas.network import GridNetwork, Bus, Feeder
from app.schemas.violation import ViolationType
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
    ) -> Tuple[List[CorrectiveAction], str, BeforeAfterComparisonData]:
        """
        Evaluates candidate corrective actions against the specified grid operating condition.
        Dynamic Phase 3B features:
        - Violation-aware regime detection (Overvoltage, Undervoltage, Feeder Overload, Transformer Overload).
        - Bounded bisection search for minimal effective battery dispatch.
        - Bounded bisection search for minimal effective active-power solar curtailment.
        - Supported feeder reconfiguration verification.
        - Transparent hierarchical safety-first candidate ranking.
        - Explicit numerical control parameters populated for all candidates.
        - Every candidate evaluated on an isolated deep copy of grid state with genuine solver recalculation.
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

        # Identify monitored critical bus (furthest from 1.0 pu)
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

            # Determine physics-driven control direction
            if has_overvoltage:
                # Solar surplus voltage rise: charge battery (negative kW) to absorb power
                bat_dir = -1.0
            elif has_undervoltage:
                # Peak demand voltage drop: discharge battery (positive kW) to boost voltage
                bat_dir = +1.0
            elif has_tx_overload and not (has_overvoltage or has_undervoltage):
                # Transformer overload without voltage violation: check power direction
                bat_dir = -1.0 if peak_solar_kw > peak_load_kw else +1.0
            elif has_feeder_overload and not (has_overvoltage or has_undervoltage):
                bat_dir = -1.0 if peak_solar_kw > peak_load_kw else +1.0
            else:
                # No primary violation: default to standby / small discharge
                bat_dir = +1.0

            # Calculate physical headroom and feasibility
            if bat_dir < 0:
                # Charging limits
                if soc_start >= 95.0:
                    can_act1 = False
                    reason_act1 = f"Battery SOC too high ({soc_start:.0f}% >= 95% charge limit). Cannot absorb surplus power on {grid.name}."
                    p_upper = 0.0
                else:
                    headroom_pct = 95.0 - soc_start
                    headroom_kwh = (headroom_pct / 100.0) * bat_cap_kwh
                    p_headroom_kw = headroom_kwh / (0.5 * 0.92)  # 30 min duration, 0.92 efficiency
                    p_upper = min(max_chg_spec, p_headroom_kw)
                    can_act1 = p_upper >= 1.0
                    reason_act1 = None if can_act1 else f"Insufficient battery headroom for charging ({p_upper:.1f} kW)."
            else:
                # Discharging limits
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
                # Helper to evaluate signed dispatch on isolated copy of grid
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

                # Boundary test at p_upper
                viols_boundary, _, _, _ = eval_bat_step(bat_dir * p_upper)

                if viols_boundary < base_violations:
                    # Bounded 1D bisection search for minimal effective dispatch magnitude in [1.0, p_upper]
                    low_p = 1.0
                    high_p = p_upper
                    best_p = p_upper
                    for _ in range(8):
                        mid_p = (low_p + high_p) / 2.0
                        v_mid, _, _, _ = eval_bat_step(bat_dir * mid_p)
                        if v_mid <= viols_boundary:
                            best_p = mid_p
                            high_p = mid_p
                        else:
                            low_p = mid_p
                    chosen_p_mag = best_p
                else:
                    # Even upper bound does not resolve all violations; use full allowable dispatch
                    chosen_p_mag = p_upper

                act1_p_kw = bat_dir * round(chosen_p_mag, 1)
                viols_1, buses_1, feeders_1, _ = eval_bat_step(act1_p_kw)
                v_crit_1 = next((b.voltage for b in buses_1 if b.id == crit_bus_id), base_v_crit)
                f_crit_1 = next((f.loadingPercent for f in feeders_1 if f.id == crit_feeder_id), base_f_crit_load)

                # Post-action battery SOC
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

        # Regime applicability: In pure undervoltage / demand deficit, curtailing solar is physically counterproductive
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

            # Helper to evaluate curtailment on isolated copy of grid
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

            # 1. Test boundary condition: 100% curtailment (C_max = peak_solar_kw)
            c_max = peak_solar_kw
            viols_boundary_c, _, _, _ = eval_curtail_step(c_max)

            if viols_boundary_c < base_violations:
                # Curtailment improves constraints! Bounded bisection search for minimal curtailment
                low_c = 0.0
                high_c = c_max
                best_c = c_max
                for _ in range(8):
                    mid_c = (low_c + high_c) / 2.0
                    v_mid, _, _, _ = eval_curtail_step(mid_c)
                    if v_mid <= viols_boundary_c:
                        best_c = mid_c
                        high_c = mid_c  # Search lower to conserve renewable generation
                    else:
                        low_c = mid_c
                curtail_amount = round(best_c, 1)
            else:
                # 100% curtailment cannot resolve violations; check minimal intervention
                curtail_amount = min(peak_solar_kw, 50.0)

            # Recalculate final state at selected minimal curtailment
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
        # 5. Transparent Hierarchical Safety-First Candidate Ranking
        # =========================================================================
        def rank_action_key(a: CorrectiveAction) -> Tuple:
            """
            Multi-criteria lexicographic comparison key. Lower tuple is better (min):
            1. Feasible outranks Infeasible (0 vs 1)
            2. Remaining violations count (lower is better)
            3. New violations penalty (penalize worsening conditions)
            4. Voltage and loading safety margins (penalize close-to-boundary operation)
            5. Negated renewable utilization (-utilization so higher utilization ranks better)
            6. Minimal intervention stress (lower dispatch/curtailment preferred if equally safe)
            7. Action type tie-breaker
            """
            if not a.isFeasible:
                return (1, 999, 999.0, 999.0, 0.0, 999.0, 9)

            feas_flag = 0
            rem_viols = a.remainingViolationsCount

            # Penalize any candidate that introduces new violations beyond baseline
            new_viol_penalty = max(0, rem_viols - base_violations) * 20.0

            # Proximity-to-limits safety margins
            v_dev = max(0.0, a.expectedVoltagePu - v_max) * 50.0 + max(0.0, v_min - a.expectedVoltagePu) * 50.0
            f_dev = max(0.0, a.expectedFeederLoadPercent - feeder_max) * 2.0 + (a.expectedFeederLoadPercent / 100.0) * 0.1
            safety_penalty = round(v_dev + f_dev + new_viol_penalty, 3)

            # Negated renewable utilization
            neg_util = -round(a.renewableUtilizationPercent, 1)

            # Intervention magnitude
            stress = round((a.curtailmentKw or 0.0) * 0.2 + abs(a.dispatchKw or 0.0) * 0.05, 2)

            type_preference = {
                "feeder_reconfiguration": 0,
                "battery_discharge": 1,
                "solar_curtailment": 2,
                "max_battery_discharge": 3,
            }.get(a.type, 9)

            return (feas_flag, rem_viols, safety_penalty, neg_util, stress, type_preference)

        ranked_actions = sorted(actions, key=rank_action_key)
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

        return actions, recommended_id, comparison_data

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
        """
        eval_grid = copy.deepcopy(grid)

        if action.type == "battery_discharge":
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
