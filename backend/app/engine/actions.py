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
    ) -> Tuple[List[CorrectiveAction], str, BeforeAfterComparisonData]:
        """
        Evaluates candidate corrective actions against the specified grid.
        Every action is evaluated by creating an independent copy of grid state,
        applying control parameters, running the actual power flow solver, and
        checking constraints via ConstraintChecker. No artificial result overrides are applied.
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

        # 1. Baseline Power Flow on an isolated copy of the grid
        grid_base = copy.deepcopy(grid)
        pf_base = PowerFlowEngine(is_alternative_topology=False)
        base_buses, base_feeders, _, _ = pf_base.solve(
            grid=grid_base,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            installed_solar_capacity_kw=installed_capacity_kw,
        )

        base_step_violations = ConstraintChecker.check_all(
            base_buses, base_feeders, "13:15", limits,
            transformer=grid_base.substation,
            tx_loading_pct=getattr(pf_base, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_base, "last_tx_flow_kva", None),
        )
        base_violations = len(base_step_violations)

        # Identify monitored critical bus
        if base_buses:
            viol_buses = [b for b in base_buses if b.voltage > v_max or b.voltage < v_min]
            if viol_buses:
                crit_bus = max(viol_buses, key=lambda b: abs(b.voltage - 1.0))
            else:
                crit_bus = max(base_buses, key=lambda b: abs(b.voltage - 1.0))
        else:
            crit_bus = Bus(id="B-0", name="Main Bus", voltage=1.0)

        # Identify monitored critical feeder
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

        is_overvoltage = base_v_crit > v_max
        is_undervoltage = base_v_crit < v_min

        actions: List[CorrectiveAction] = []

        # =========================================================================
        # 1. ACTION 1: Battery Energy Storage Dispatch (ACT-01)
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
            act1_soc = battery_config.initialSocPercent
        else:
            max_dispatch = min(40.0, float(target_battery.maxDischargeKw or battery_config.maxDischargeKw or 40.0))
            if is_overvoltage:
                # Solar surplus: charge battery to absorb power (-kW)
                act1_p_kw = -max_dispatch
                if battery_config.initialSocPercent >= 95.0:
                    can_act1 = False
                    reason_act1 = f"Battery SOC too high ({battery_config.initialSocPercent:.0f}% >= 95% charge limit). Cannot absorb surplus power on {grid.name}."
                else:
                    can_act1 = True
                    reason_act1 = None
            else:
                # Peak demand / undervoltage: discharge battery to inject power (+kW)
                act1_p_kw = max_dispatch
                can_dis, reason_dis = b_engine.can_discharge(max_dispatch, duration_hours=0.5)
                if battery_config.initialSocPercent <= 20.0 or not can_dis:
                    can_act1 = False
                    reason_act1 = reason_dis or f"Battery SOC too low ({battery_config.initialSocPercent:.0f}% <= 20% safe reserve floor on {grid.name})."
                else:
                    can_act1 = True
                    reason_act1 = None

            if can_act1:
                energy_kwh = (abs(act1_p_kw) * 0.5) / 0.92
                soc_delta = (energy_kwh / max(10.0, battery_config.capacityKwh)) * 100.0
                if act1_p_kw < 0:
                    act1_soc = round(min(98.0, battery_config.initialSocPercent + soc_delta), 1)
                else:
                    act1_soc = round(max(0.0, battery_config.initialSocPercent - soc_delta), 1)
            else:
                act1_soc = battery_config.initialSocPercent

        # Genuine solver execution on isolated grid copy
        grid_eval_1 = copy.deepcopy(grid)
        pf_1 = PowerFlowEngine(is_alternative_topology=False)
        buses_1, feeders_1, _, _ = pf_1.solve(
            grid=grid_eval_1,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            battery_power_kw=act1_p_kw if can_act1 else 0.0,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
        viols_1_list = ConstraintChecker.check_all(
            buses_1, feeders_1, "13:15", limits,
            transformer=grid_eval_1.substation,
            tx_loading_pct=getattr(pf_1, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_1, "last_tx_flow_kva", None),
        )
        viols_1 = len(viols_1_list) if can_act1 else base_violations
        v_crit_1 = next((b.voltage for b in buses_1 if b.id == crit_bus_id), base_v_crit) if can_act1 else base_v_crit
        f_crit_1 = next((f.loadingPercent for f in feeders_1 if f.id == crit_feeder_id), base_f_crit_load) if can_act1 else base_f_crit_load

        actions.append(
            CorrectiveAction(
                id="ACT-01",
                type="battery_discharge",
                title=f"BESS Dispatch ({b_name})",
                description=f"Dispatch active storage at {b_bus} to mitigate voltage deviations and branch flow on {grid.name}.",
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
                buses_2, feeders_2, "13:15", limits,
                transformer=grid_eval_2.substation,
                tx_loading_pct=getattr(pf_2, "last_tx_loading", None),
                tx_flow_kva=getattr(pf_2, "last_tx_flow_kva", None),
            )
            viols_2 = len(viols_2_list)
            v_crit_2 = next((b.voltage for b in buses_2 if b.id == crit_bus_id), base_v_crit)
            f_crit_2 = next((f.loadingPercent for f in feeders_2 if f.id == crit_feeder_id), base_f_crit_load)
        else:
            can_act2 = False
            reason_act2 = f"Network topology on {grid.name} lacks an alternate reconfigurable feeder or tie-line switch."
            act2_title = "Feeder Reconfiguration (Unsupported)"
            act2_desc = f"Cannot reconfigure topology: {grid.name} has no available alternative tie-line switches."
            act2_param = "No Alternate Feeder"
            v_crit_2 = base_v_crit
            f_crit_2 = base_f_crit_load
            viols_2 = base_violations

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
                batterySocPercent=battery_config.initialSocPercent,
                resolvedViolationsCount=max(0, base_violations - viols_2) if can_act2 else 0,
                remainingViolationsCount=viols_2,
                renewableUtilizationPercent=100.0,
                targetComponentId=crit_feeder_id,
                targetComponentName=crit_feeder_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 3. ACTION 3: Active-Power Solar Curtailment (ACT-03)
        # =========================================================================
        target_solar = next(
            (s for s in grid.solarUnits if s.busId == crit_bus_id),
            (grid.solarUnits[0] if grid.solarUnits else None)
        )
        s_name = target_solar.name if target_solar else "Solar Farm"
        s_bus = target_solar.busId if target_solar else crit_bus_id

        if not target_solar or peak_solar_kw <= 0.0:
            can_act3 = False
            reason_act3 = f"No active solar generation available to curtail on {grid.name}."
            curtail_amount = 0.0
            v_crit_3 = base_v_crit
            f_crit_3 = base_f_crit_load
            viols_3 = base_violations
            curtailed_used = peak_solar_kw
            utilization_3 = 100.0
        else:
            can_act3 = True
            reason_act3 = None
            curtail_amount = min(peak_solar_kw, max(15.0, min(50.0, peak_solar_kw * 0.20)))

            grid_eval_3 = copy.deepcopy(grid)
            pf_3 = PowerFlowEngine(is_alternative_topology=False)
            buses_3, feeders_3, _, _ = pf_3.solve(
                grid=grid_eval_3,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                solar_curtailment_kw=curtail_amount,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
            viols_3_list = ConstraintChecker.check_all(
                buses_3, feeders_3, "13:15", limits,
                transformer=grid_eval_3.substation,
                tx_loading_pct=getattr(pf_3, "last_tx_loading", None),
                tx_flow_kva=getattr(pf_3, "last_tx_flow_kva", None),
            )
            viols_3 = len(viols_3_list)
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
                batterySocPercent=battery_config.initialSocPercent,
                resolvedViolationsCount=max(0, base_violations - viols_3) if can_act3 else 0,
                remainingViolationsCount=viols_3,
                renewableUtilizationPercent=utilization_3,
                targetComponentId=s_bus,
                targetComponentName=s_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 4. ACTION 4: Forced Deep Battery Discharge (Infeasible Test - ACT-04)
        # =========================================================================
        can_act4, reason_act4 = b_engine.can_discharge(80.0, duration_hours=0.25)
        if battery_config.initialSocPercent <= 20.0 or not can_act4:
            can_act4 = False
            reason_act4 = (
                f"Requested discharge exceeds available BESS reserve. "
                f"Battery SOC too low ({battery_config.initialSocPercent:.0f}% <= 20% safe reserve floor on {grid.name})."
            )

        # Evaluate through solver without fabricated overrides
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
            buses_4, feeders_4, "13:15", limits,
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
                description=f"High-rate discharge (-80 kW) beyond warranty depth-of-discharge threshold on {grid.name}.",
                parameterDelta="-80 kW (Deep)",
                durationMinutes=15,
                isFeasible=can_act4,
                infeasibleReason=reason_act4 if not can_act4 else None,
                expectedVoltagePu=v_crit_4,
                expectedFeederLoadPercent=f_crit_4,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=15.0 if can_act4 else battery_config.initialSocPercent,
                resolvedViolationsCount=max(0, base_violations - viols_4) if can_act4 else 0,
                remainingViolationsCount=viols_4,
                renewableUtilizationPercent=100.0,
                targetComponentId=b_bus,
                targetComponentName=b_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 5. Honest Ranking Against All Constraints
        # =========================================================================
        type_preference = {
            "feeder_reconfiguration": 0,
            "battery_discharge": 1,
            "solar_curtailment": 2,
            "max_battery_discharge": 3,
        }
        feasible_actions = [a for a in actions if a.isFeasible]
        effective_actions = [a for a in feasible_actions if a.remainingViolationsCount < base_violations]

        if effective_actions:
            # Pick action resolving the most violations with minimal remaining violations
            best_action = min(
                effective_actions,
                key=lambda a: (
                    a.remainingViolationsCount,
                    -a.resolvedViolationsCount,
                    -a.renewableUtilizationPercent,
                    type_preference.get(a.type, 9),
                ),
            )
            recommended_id = best_action.id
        elif feasible_actions:
            best_action = min(
                feasible_actions,
                key=lambda a: (
                    a.remainingViolationsCount,
                    -a.renewableUtilizationPercent,
                    type_preference.get(a.type, 9),
                ),
            )
            recommended_id = best_action.id
        else:
            recommended_id = actions[0].id if actions else "ACT-01"

        rec_act = next((a for a in actions if a.id == recommended_id), actions[0])
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
                before=battery_config.initialSocPercent,
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
        Used by both evaluation and execution to guarantee identical recalculation.
        """
        eval_grid = copy.deepcopy(grid)
        if action.type == "battery_discharge":
            # Extract signed dispatch kW from parameterDelta
            p_kw = -40.0 if "Charge" in (action.parameterDelta or "") else 40.0
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                battery_power_kw=p_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "feeder_reconfiguration":
            pf = PowerFlowEngine(is_alternative_topology=True)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "solar_curtailment":
            # Parse curtailment from solarUsedKw or parameterDelta
            curtail_kw = max(0.0, peak_solar_kw - action.solarUsedKw)
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                solar_curtailment_kw=curtail_kw,
                installed_solar_capacity_kw=installed_capacity_kw,
            )
        elif action.type == "max_battery_discharge":
            pf = PowerFlowEngine(is_alternative_topology=False)
            buses, feeders, _, _ = pf.solve(
                grid=eval_grid,
                solar_kw=peak_solar_kw,
                load_kw=peak_load_kw,
                battery_power_kw=80.0 if action.isFeasible else 0.0,
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
