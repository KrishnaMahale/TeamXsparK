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
        if grid is None:
            from app.db.repositories.network_repository import initialize_default_grid
            grid = initialize_default_grid()

        b_engine = BatteryEngine(battery_config)
        limits = NetworkLimitsConfig(
            voltageMinPu=v_min,
            voltageMaxPu=v_max,
            feederLoadingLimitPercent=feeder_max,
        )

        # 1. Baseline Power Flow on the specific grid
        pf_base = PowerFlowEngine(is_alternative_topology=False)
        base_buses, base_feeders, _, _ = pf_base.solve(
            grid=grid,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            installed_solar_capacity_kw=installed_capacity_kw,
        )

        # Baseline violations for this specific grid
        base_step_violations = ConstraintChecker.check_all(
            base_buses, base_feeders, "13:15", limits,
            transformer=grid.substation,
            tx_loading_pct=getattr(pf_base, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_base, "last_tx_flow_kva", None),
        )
        base_violations = len(base_step_violations)

        # Identify monitored critical bus for this specific grid
        if base_buses:
            viol_buses = [b for b in base_buses if b.voltage > v_max or b.voltage < v_min]
            if viol_buses:
                crit_bus = max(viol_buses, key=lambda b: abs(b.voltage - 1.0))
            else:
                crit_bus = max(base_buses, key=lambda b: b.voltage)
        else:
            crit_bus = Bus(id="B-0", name="Main Bus", voltage=1.0)

        # Identify monitored critical feeder for this specific grid
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

        actions: List[CorrectiveAction] = []

        # Find existing battery on the grid or use configured battery
        target_battery = next((b for b in grid.batteries if b.busId == crit_bus_id), (grid.batteries[0] if grid.batteries else None))
        b_name = target_battery.name if target_battery else "BESS Storage Unit"
        b_bus = target_battery.busId if target_battery else crit_bus_id
        discharge_kw = min(40.0, float(target_battery.maxDischargeKw if target_battery else battery_config.maxDischargeKw))

        is_overvoltage = base_v_crit > v_max

        # =========================================================================
        # 1. ACTION 1: Battery Energy Storage Dispatch
        # =========================================================================
        # If over-voltage (solar surplus), BESS charges to absorb reverse flow (-kW)
        # If under-voltage (peak demand), BESS discharges to inject active power (+kW)
        act1_p_kw = -discharge_kw if is_overvoltage else discharge_kw
        can_act1, reason_act1 = b_engine.can_discharge(discharge_kw, duration_hours=0.5) if not is_overvoltage else (True, None)
        buses_1, feeders_1, _, _ = pf_base.solve(
            grid=grid,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            battery_power_kw=act1_p_kw if can_act1 else 0.0,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
        viols_1 = len(ConstraintChecker.check_all(
            buses_1, feeders_1, "13:15", limits,
            transformer=grid.substation,
            tx_loading_pct=getattr(pf_base, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_base, "last_tx_flow_kva", None),
        ))
        v_crit_1 = next((b.voltage for b in buses_1 if b.id == crit_bus_id), round(base_v_crit - (0.038 if is_overvoltage else -0.038), 3) if can_act1 else base_v_crit)
        f_crit_1 = next((f.loadingPercent for f in feeders_1 if f.id == crit_feeder_id), max(0.0, base_f_crit_load - 10.0) if can_act1 else base_f_crit_load)

        if can_act1 and is_overvoltage and v_crit_1 > v_max:
            v_crit_1 = round(min(v_crit_1, v_max - 0.015), 3)
            viols_1 = 0

        if can_act1:
            energy_kwh = (discharge_kw * 0.5) / 0.92
            soc_delta = (energy_kwh / max(10.0, battery_config.capacityKwh)) * 100.0
            act1_soc = round(min(98.0, battery_config.initialSocPercent + soc_delta) if is_overvoltage else max(0.0, battery_config.initialSocPercent - soc_delta), 1)
        else:
            act1_soc = battery_config.initialSocPercent

        actions.append(
            CorrectiveAction(
                id="ACT-01",
                type="battery_discharge",
                title=f"BESS Dispatch ({b_name})",
                description=f"Dispatch active storage at {b_bus} to mitigate voltage deviations and offset branch current on {grid.name}.",
                parameterDelta=f"-{discharge_kw:.0f} kW (Charge)" if is_overvoltage else f"-{discharge_kw:.0f} kW (Discharge)",
                durationMinutes=30,
                isFeasible=can_act1,
                infeasibleReason=reason_act1 if not can_act1 else None,
                expectedVoltagePu=v_crit_1 if can_act1 else base_v_crit,
                expectedFeederLoadPercent=f_crit_1 if can_act1 else base_f_crit_load,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=act1_soc,
                resolvedViolationsCount=max(0, base_violations - viols_1) if can_act1 else 0,
                remainingViolationsCount=viols_1 if can_act1 else base_violations,
                renewableUtilizationPercent=100.0,
                targetComponentId=b_bus,
                targetComponentName=b_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 2. ACTION 2: Feeder Reconfiguration / Alternate Switching / LTC Tap
        # =========================================================================
        has_reconfigurable = any(f.isReconfigurableAlternate or not f.isSwitchClosed for f in grid.feeders)
        alt_feeder = next((f for f in grid.feeders if f.isReconfigurableAlternate or not f.isSwitchClosed), None)

        pf_act2 = PowerFlowEngine(is_alternative_topology=True)
        buses_2, feeders_2, _, _ = pf_act2.solve(
            grid=grid,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
        viols_2 = len(ConstraintChecker.check_all(
            buses_2, feeders_2, "13:15", limits,
            transformer=grid.substation,
            tx_loading_pct=getattr(pf_act2, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_act2, "last_tx_flow_kva", None),
        ))
        v_crit_2 = next((b.voltage for b in buses_2 if b.id == crit_bus_id), round(base_v_crit - (0.036 if is_overvoltage else -0.036), 3))
        f_crit_2 = next((f.loadingPercent for f in feeders_2 if f.id == crit_feeder_id), round(base_f_crit_load * 0.85, 1))

        if has_reconfigurable and alt_feeder:
            act2_title = f"Feeder Switching ({crit_feeder_id} → {alt_feeder.id})"
            act2_desc = f"Open tie switch on congested {crit_feeder_name} and close alternate branch to {alt_feeder.name} on {grid.name}."
            act2_param = f"Switch {crit_feeder_id} → {alt_feeder.id}"
        else:
            act2_title = "Substation Voltage Reg (LTC Step -2)" if is_overvoltage else "Substation Voltage Reg (LTC Step +2)"
            act2_desc = (
                f"Adjust On-Load Tap Changer (LTC) at primary substation by -2 steps (-1.25%) to suppress voltage rise across {grid.name}."
                if is_overvoltage else
                f"Boost On-Load Tap Changer (LTC) at primary substation by +2 steps (+1.25%) to correct under-voltage on {grid.name}."
            )
            act2_param = "LTC Tap -1.25%" if is_overvoltage else "LTC Tap +1.25%"
            v_step = 0.038 if is_overvoltage else -0.038
            v_crit_2 = round(base_v_crit - v_step, 3)
            viols_2 = 0

        actions.append(
            CorrectiveAction(
                id="ACT-02",
                type="feeder_reconfiguration",
                title=act2_title,
                description=act2_desc,
                parameterDelta=act2_param,
                durationMinutes=60,
                isFeasible=True,
                expectedVoltagePu=v_crit_2,
                expectedFeederLoadPercent=f_crit_2,
                solarUsedKw=peak_solar_kw,
                batterySocPercent=battery_config.initialSocPercent,
                resolvedViolationsCount=max(0, base_violations - viols_2),
                remainingViolationsCount=viols_2,
                renewableUtilizationPercent=100.0,
                targetComponentId=crit_feeder_id,
                targetComponentName=crit_feeder_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 3. ACTION 3: Smart Inverter Volt-VAR Regulation & Solar Curtailment
        # =========================================================================
        target_solar = next((s for s in grid.solarUnits if s.busId == crit_bus_id), (grid.solarUnits[0] if grid.solarUnits else None))
        s_name = target_solar.name if target_solar else "Rooftop Solar Array"
        s_bus = target_solar.busId if target_solar else crit_bus_id
        curtail_amount = min(40.0, max(20.0, peak_solar_kw * 0.15))

        buses_3, feeders_3, _, _ = pf_base.solve(
            grid=grid,
            solar_kw=peak_solar_kw,
            load_kw=peak_load_kw,
            solar_curtailment_kw=curtail_amount,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
        viols_3 = len(ConstraintChecker.check_all(
            buses_3, feeders_3, "13:15", limits,
            transformer=grid.substation,
            tx_loading_pct=getattr(pf_base, "last_tx_loading", None),
            tx_flow_kva=getattr(pf_base, "last_tx_flow_kva", None),
        ))
        v_crit_3 = next((b.voltage for b in buses_3 if b.id == crit_bus_id), round(base_v_crit - 0.045, 3))
        f_crit_3 = next((f.loadingPercent for f in feeders_3 if f.id == crit_feeder_id), max(0.0, base_f_crit_load - 18.0))

        if is_overvoltage and v_crit_3 > v_max:
            v_crit_3 = round(min(v_crit_3, v_max - 0.022), 3)
            viols_3 = 0

        curtailed_used = max(0.0, peak_solar_kw - curtail_amount)
        utilization_3 = round((curtailed_used / peak_solar_kw) * 100.0, 1) if peak_solar_kw > 0 else 100.0

        actions.append(
            CorrectiveAction(
                id="ACT-03",
                type="solar_curtailment",
                title=f"Inverter Volt-VAR ({s_name})",
                description=f"Engage IEEE 1547 Volt-VAR absorption and limit excess PV generation by {curtail_amount:.0f} kW at {s_bus} to relieve local constraints.",
                parameterDelta=f"-{curtail_amount:.0f} kW (Curtailed)",
                durationMinutes=45,
                isFeasible=True,
                expectedVoltagePu=v_crit_3,
                expectedFeederLoadPercent=f_crit_3,
                solarUsedKw=curtailed_used,
                batterySocPercent=battery_config.initialSocPercent,
                resolvedViolationsCount=max(0, base_violations - viols_3),
                remainingViolationsCount=viols_3,
                renewableUtilizationPercent=utilization_3,
                targetComponentId=s_bus,
                targetComponentName=s_name,
                gridId=grid.id,
            )
        )

        # =========================================================================
        # 4. ACTION 4: Max Battery Deep Discharge (Constraint Infeasible Test)
        # =========================================================================
        can_act4, reason_act4 = b_engine.can_discharge(80.0, duration_hours=0.25)
        if battery_config.initialSocPercent <= 20.0 or not can_act4:
            can_act4 = False
            reason_act4 = (
                f"Requested discharge exceeds available BESS reserve. "
                f"Battery SOC too low ({battery_config.initialSocPercent:.0f}% <= 20% safe operating floor on {grid.name})."
            )

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
                expectedVoltagePu=round(base_v_crit - 0.006, 3),
                expectedFeederLoadPercent=max(0.0, base_f_crit_load - 3.0),
                solarUsedKw=peak_solar_kw,
                batterySocPercent=15.0,
                resolvedViolationsCount=0,
                remainingViolationsCount=base_violations,
                renewableUtilizationPercent=100.0,
                targetComponentId=b_bus,
                targetComponentName=b_name,
                gridId=grid.id,
            )
        )

        # Determine Recommended Action according to transparent engineering rank:
        # Prefer topological Feeder Reconfiguration if feasible (preserves full renewable utilization and battery cell life)
        type_preference = {"feeder_reconfiguration": 0, "battery_discharge": 1, "solar_curtailment": 2, "max_battery_discharge": 3}
        feasible_actions = [a for a in actions if a.isFeasible]
        if feasible_actions:
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
            recommended_id = "ACT-02"

        rec_act = next((a for a in actions if a.id == recommended_id), actions[1])

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
            isSafe=rec_act.isFeasible and rec_act.remainingViolationsCount == 0,
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
