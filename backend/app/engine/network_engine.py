import datetime
from typing import Dict, List
from app.schemas.simulation import (
    SimulationInput,
    PowerFlowResult,
    FullSimulationResult,
    SimulationSummaryInfo,
)
from app.schemas.violation import GridViolation
from app.schemas.network import GridNetwork
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.engine.actions import ActionEngine


class NetworkEngine:
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
                buses, feeders, t, input_data.networkConfig
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

        # Snapshot evaluation time (13:15, 13:00, or midday)
        peak_time = "13:15" if "13:15" in all_times else ("13:00" if "13:00" in all_times else all_times[len(all_times) // 2])
        peak_result = time_step_results.get(peak_time, list(time_step_results.values())[0])

        peak_solar = max([s.solarKw for s in input_data.solarTimeSeries], default=input_data.currentSolarKw)
        peak_load = max([l.loadKw for l in input_data.loadTimeSeries], default=input_data.currentLoadKw)

        # Evaluate candidate corrective actions for the specific grid
        actions, recommended_action_id, comparison_data = ActionEngine.evaluate_candidate_actions(
            peak_solar_kw=peak_solar,
            peak_load_kw=peak_load,
            battery_config=input_data.batteryConfig,
            v_max=input_data.networkConfig.voltageMaxPu,
            v_min=input_data.networkConfig.voltageMinPu,
            feeder_max=input_data.networkConfig.feederLoadingLimitPercent,
            installed_capacity_kw=input_data.installedSolarCapacityKw,
            grid=grid,
        )

        initial_violations_count = len(peak_result.violations)

        status_str = "safe"
        if input_data.batteryConfig.initialSocPercent <= 15:
            status_str = "infeasible"
        elif initial_violations_count > 0:
            status_str = "violations_detected"

        rec_action_obj = next((a for a in actions if a.id == recommended_action_id), None)
        rec_title = rec_action_obj.title if rec_action_obj else "Optimal Power Flow Maintained"
        if initial_violations_count == 0:
            rec_title = "Optimal power flow maintained (No intervention required)"

        summary = SimulationSummaryInfo(
            scenarioName=input_data.scenarioName,
            simulationTime=peak_time,
            solarKw=peak_solar,
            loadKw=peak_load,
            netPowerKw=peak_solar - peak_load,
            status=status_str,
            initialViolations=initial_violations_count,
            resolvedViolations=initial_violations_count if status_str != "infeasible" else 0,
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
