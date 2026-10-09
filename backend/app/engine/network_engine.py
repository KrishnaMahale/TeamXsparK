import datetime
from typing import Dict, List, Tuple, Optional
from app.schemas.simulation import (
    SimulationInput,
    PowerFlowResult,
    FullSimulationResult,
    SimulationSummaryInfo,
    NetworkLimitsConfig,
)
from app.schemas.violation import GridViolation, ViolationType, ViolationSeverity
from app.schemas.network import GridNetwork, Transformer
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.actions import ActionEngine


class NetworkEngine:
    @staticmethod
    def calculate_timestep_severity(
        result: PowerFlowResult,
        config: NetworkLimitsConfig,
        transformer: Optional[Transformer] = None,
    ) -> Tuple[float, int, int]:
        """
        Calculates normalized constraint severity for a power flow result.
        Returns:
            (total_severity_score, critical_violations_count, total_violations_count)
        """
        v_max = config.voltageMaxPu
        v_min = config.voltageMinPu
        f_max = config.feederLoadingLimitPercent
        tx_max = 100.0

        critical_count = 0
        total_count = len(result.violations)
        total_severity = 0.0

        for v in result.violations:
            is_critical = (v.severity == ViolationSeverity.CRITICAL or v.severity == "critical")
            if is_critical:
                critical_count += 1

            if v.type == ViolationType.OVER_VOLTAGE:
                norm_dev = max(0.0, (v.value - v_max) / max(0.001, v_max - 1.0))
                severity = 100.0 + 100.0 * norm_dev
            elif v.type == ViolationType.UNDER_VOLTAGE:
                norm_dev = max(0.0, (v_min - v.value) / max(0.001, 1.0 - v_min))
                base_val = 100.0 if is_critical else 60.0
                severity = base_val + 80.0 * norm_dev
            elif v.type == ViolationType.FEEDER_OVERLOAD:
                norm_dev = max(0.0, (v.value - f_max) / max(1.0, f_max))
                severity = 100.0 + 100.0 * norm_dev
            elif v.type == ViolationType.TRANSFORMER_OVERLOAD:
                norm_dev = max(0.0, (v.value - tx_max) / max(1.0, tx_max))
                severity = 100.0 + 100.0 * norm_dev
            else:
                severity = 50.0

            total_severity += severity

        return total_severity, critical_count, total_count

    @classmethod
    def select_worst_timestep(
        cls,
        time_step_results: Dict[str, PowerFlowResult],
        all_times: List[str],
        config: NetworkLimitsConfig,
        transformer: Optional[Transformer] = None,
    ) -> str:
        """
        Determines the most critical operating timestep across all simulated points.
        Rules:
        1. If violations exist, prioritize:
           - Maximum critical violations count
           - Maximum normalized constraint severity score
           - Total violations count
           - Earliest chronological order (tie-breaker)
        2. If no violations exist, deterministic no-violation behavior:
           - Timestep with largest net power imbalance, preferring midday peak (13:15 / 13:00)
             if present.
        """
        scored_times = []
        for idx, t in enumerate(all_times):
            res = time_step_results[t]
            sev, crit_cnt, tot_cnt = cls.calculate_timestep_severity(res, config, transformer)
            net_stress = abs(res.totalGenerationKw - res.totalDemandKw)
            # Tuple: (crit_cnt, sev, tot_cnt, -idx for earliest chronological, net_stress, time_str)
            scored_times.append((crit_cnt, sev, tot_cnt, -idx, net_stress, t))

        has_violations = any(sc[2] > 0 for sc in scored_times)

        if has_violations:
            viol_times = [sc for sc in scored_times if sc[2] > 0]
            # Max critical count, max severity, max total count, earliest chronological (-idx)
            viol_times.sort(key=lambda x: (x[0], x[1], x[2], x[3]), reverse=True)
            return viol_times[0][5]
        else:
            # Deterministic no-violation behavior:
            if "13:15" in all_times:
                return "13:15"
            if "13:00" in all_times:
                return "13:00"
            # Sort by net stress, then earliest chronological
            scored_times.sort(key=lambda x: (x[4], x[3]), reverse=True)
            return scored_times[0][5]

    @staticmethod
    def run_full_simulation(input_data: SimulationInput, grid: GridNetwork) -> FullSimulationResult:
        time_step_results: Dict[str, PowerFlowResult] = {}
        all_violations: List[GridViolation] = []

        is_alt = input_data.networkConfig.feederTopology == "alternative"
        pf_engine = PowerFlowEngine(is_alternative_topology=is_alt)

        # Build combined timestamps
        solar_times = {s.time: s.solarKw for s in input_data.solarTimeSeries}
        load_times = {l.time: l.loadKw for l in input_data.loadTimeSeries}
        all_times = sorted(list(set(list(solar_times.keys()) + list(load_times.keys()))))

        if not all_times:
            # Fallback if time series is empty
            all_times = ["12:00"]
            solar_times["12:00"] = input_data.currentSolarKw
            load_times["12:00"] = input_data.currentLoadKw

        # Track battery SOC dynamically across diurnal timestamps
        current_soc = float(input_data.batteryConfig.initialSocPercent)
        b_cap = max(10.0, float(input_data.batteryConfig.capacityKwh))
        b_max_chg = float(input_data.batteryConfig.maxChargeKw)
        b_max_dischg = float(input_data.batteryConfig.maxDischargeKw)

        prev_t_hours = None

        for t in all_times:
            s_kw = solar_times.get(t, input_data.currentSolarKw)
            l_kw = load_times.get(t, input_data.currentLoadKw)

            # Determine dt in hours
            try:
                ps = t.split(":")
                t_hours = float(ps[0]) + float(ps[1]) / 60.0
            except Exception:
                t_hours = 12.0

            default_dt = 0.25 if len(all_times) >= 48 else 1.0
            dt = default_dt if prev_t_hours is None else max(0.25, min(2.0, t_hours - prev_t_hours))
            prev_t_hours = t_hours

            # Battery dynamic state evolution:
            # If excess solar (s_kw > l_kw), battery charges up to 95% SOC
            # If high evening demand (t_hours >= 17 and l_kw > s_kw), battery discharges down to 20% SOC
            net_p = s_kw - l_kw
            if net_p > 10.0 and current_soc < 95.0:
                chg_power = min(b_max_chg, net_p * 0.5)
                delta_soc = ((chg_power * dt * 0.92) / b_cap) * 100.0
                current_soc = min(98.0, round(current_soc + delta_soc, 1))
            elif net_p < -10.0 and t_hours >= 17.0 and current_soc > 20.0:
                dischg_power = min(b_max_dischg, abs(net_p) * 0.4)
                delta_soc = ((dischg_power * dt / 0.92) / b_cap) * 100.0
                current_soc = max(15.0, round(current_soc - delta_soc, 1))

            buses, feeders, losses, tx_loading = pf_engine.solve(
                grid=grid,
                solar_kw=s_kw,
                load_kw=l_kw,
                installed_solar_capacity_kw=input_data.installedSolarCapacityKw,
            )

            step_violations = ConstraintChecker.check_all(
                buses, feeders, t, input_data.networkConfig,
                transformer=grid.substation,
                tx_loading_pct=tx_loading,
                tx_flow_kva=getattr(pf_engine, "last_tx_flow_kva", None),
            )
            all_violations.extend(step_violations)

            time_step_results[t] = PowerFlowResult(
                timestamp=t,
                converged=True,
                iterations=4,
                buses=buses,
                feeders=feeders,
                violations=step_violations,
                totalLossKw=losses,
                totalGenerationKw=s_kw,
                totalDemandKw=l_kw,
                batterySocPercent=current_soc,
            )

        # 2. Dynamic Worst-Timestep Selection across all simulated points
        worst_time = NetworkEngine.select_worst_timestep(
            time_step_results=time_step_results,
            all_times=all_times,
            config=input_data.networkConfig,
            transformer=grid.substation,
        )
        worst_result = time_step_results.get(worst_time, list(time_step_results.values())[0])

        eval_solar = worst_result.totalGenerationKw
        eval_load = worst_result.totalDemandKw
        eval_soc = worst_result.batterySocPercent

        # 3. Evaluate candidate corrective actions for the specific grid at the worst operating condition
        actions, recommended_action_id, comparison_data = ActionEngine.evaluate_candidate_actions(
            peak_solar_kw=eval_solar,
            peak_load_kw=eval_load,
            battery_config=input_data.batteryConfig,
            v_max=input_data.networkConfig.voltageMaxPu,
            v_min=input_data.networkConfig.voltageMinPu,
            feeder_max=input_data.networkConfig.feederLoadingLimitPercent,
            installed_capacity_kw=input_data.installedSolarCapacityKw,
            grid=grid,
            eval_time=worst_time,
            eval_battery_soc=eval_soc,
        )

        initial_violations_count = len(worst_result.violations)

        status_str = "safe"
        if input_data.batteryConfig.initialSocPercent <= 15:
            status_str = "infeasible"
        elif initial_violations_count > 0:
            status_str = "violations_detected"

        rec_action_obj = next((a for a in actions if a.id == recommended_action_id), None)
        rec_title = rec_action_obj.title if rec_action_obj else "Optimal Power Flow Maintained"
        if initial_violations_count == 0:
            rec_title = "Optimal power flow maintained (No intervention required)"

        resolved_count = (
            rec_action_obj.resolvedViolationsCount
            if rec_action_obj and rec_action_obj.isFeasible
            else 0
        )

        summary = SimulationSummaryInfo(
            scenarioName=input_data.scenarioName,
            simulationTime=worst_time,
            solarKw=eval_solar,
            loadKw=eval_load,
            netPowerKw=eval_solar - eval_load,
            status=status_str,
            initialViolations=initial_violations_count,
            resolvedViolations=resolved_count,
            recommendedAction=rec_title,
            isActionFeasible=(status_str != "infeasible"),
        )

        return FullSimulationResult(
            scenarioId=input_data.scenarioName,
            input=input_data,
            timeStepResults=time_step_results,
            availableActions=actions,
            recommendedActionId=recommended_action_id,
            comparisonData=comparison_data,
            summary=summary,
        )
