import math
from typing import List, Dict, Any
from app.schemas.domestic import (
    HouseNode,
    DomesticTransformer,
    StreetSegment,
    DomesticGridNetwork,
    DomesticGridViolation,
    Coords,
    RooftopSolarSystem,
    HomeBatterySystem,
    DomesticConsumption,
    DomesticTelemetry,
    ApplianceItem,
)
from app.schemas.common import ComponentStatus

RAW_HOUSES: List[Dict[str, Any]] = [
    {
        "id": "HOUSE-01",
        "name": "Maple Villa",
        "address": "102 Sunburst Way",
        "houseNumber": 1,
        "distanceMeters": 30.0,
        "phase": "L1",
        "coords": {"x": 190, "y": 140},
        "hasSolar": True,
        "installedCapacityKw": 5.5,
        "panelCount": 14,
        "panelType": "400W Monocrystalline PERC",
        "cellTechnology": "Mono PERC Multi-Busbar (9BB)",
        "moduleWattageW": 400,
        "totalSurfaceAreaM2": 27.3,
        "tiltDeg": 28.0,
        "azimuth": "180° True South",
        "inverterCapacityKw": 5.0,
        "inverterModel": "SolarEdge SE5000H HD-Wave",
        "hasBattery": True,
        "batteryBrand": "Enphase IQ 10T Storage",
        "batteryCapacityKwh": 10.5,
        "initialSoc": 78.0,
        "baseLoadKw": 0.9,
        "hasEv": False,
    },
    {
        "id": "HOUSE-02",
        "name": "Oak Cottage",
        "address": "104 Sunburst Way",
        "houseNumber": 2,
        "distanceMeters": 65.0,
        "phase": "L2",
        "coords": {"x": 330, "y": 140},
        "hasSolar": True,
        "installedCapacityKw": 4.2,
        "panelCount": 11,
        "panelType": "380W All-Black Monocrystalline",
        "cellTechnology": "N-Type TOPCon Cell",
        "moduleWattageW": 380,
        "totalSurfaceAreaM2": 21.5,
        "tiltDeg": 25.0,
        "azimuth": "90°/270° East-West Split",
        "inverterCapacityKw": 4.0,
        "inverterModel": "SMA Sunny Boy 4.0-1AV",
        "hasBattery": False,
        "baseLoadKw": 0.6,
        "hasEv": False,
    },
    {
        "id": "HOUSE-03",
        "name": "Pine Residence",
        "address": "106 Sunburst Way",
        "houseNumber": 3,
        "distanceMeters": 100.0,
        "phase": "L3",
        "coords": {"x": 470, "y": 140},
        "hasSolar": True,
        "installedCapacityKw": 7.6,
        "panelCount": 19,
        "panelType": "400W Bifacial Dual-Glass",
        "cellTechnology": "N-Type TOPCon Bifacial",
        "moduleWattageW": 400,
        "totalSurfaceAreaM2": 37.1,
        "tiltDeg": 30.0,
        "azimuth": "180° True South",
        "inverterCapacityKw": 7.0,
        "inverterModel": "Tesla Solar Inverter 7.6kW",
        "hasBattery": True,
        "batteryBrand": "Tesla Powerwall 2 Plus",
        "batteryCapacityKwh": 13.5,
        "initialSoc": 84.0,
        "baseLoadKw": 1.1,
        "hasEv": True,
    },
    {
        "id": "HOUSE-04",
        "name": "Cedar House (No Solar)",
        "address": "108 Sunburst Way",
        "houseNumber": 4,
        "distanceMeters": 135.0,
        "phase": "L1",
        "coords": {"x": 610, "y": 140},
        "hasSolar": False,
        "installedCapacityKw": 0.0,
        "panelCount": 0,
        "panelType": "None (Tenant Occupied)",
        "cellTechnology": "N/A",
        "moduleWattageW": 0,
        "totalSurfaceAreaM2": 0.0,
        "tiltDeg": 0.0,
        "azimuth": "N/A",
        "inverterCapacityKw": 0.0,
        "inverterModel": "None",
        "hasBattery": False,
        "baseLoadKw": 1.0,
        "hasEv": False,
    },
    {
        "id": "HOUSE-05",
        "name": "Willow Bungalow",
        "address": "103 Sunburst Way",
        "houseNumber": 5,
        "distanceMeters": 170.0,
        "phase": "L2",
        "coords": {"x": 190, "y": 390},
        "hasSolar": True,
        "installedCapacityKw": 6.2,
        "panelCount": 16,
        "panelType": "390W Monocrystalline TOPCon",
        "cellTechnology": "N-Type TOPCon Passivated Contact",
        "moduleWattageW": 390,
        "totalSurfaceAreaM2": 31.2,
        "tiltDeg": 26.0,
        "azimuth": "180° True South",
        "inverterCapacityKw": 6.0,
        "inverterModel": "Fronius Primo 6.0-1",
        "hasBattery": True,
        "batteryBrand": "BYD Battery-Box Premium HVS",
        "batteryCapacityKwh": 7.7,
        "initialSoc": 91.0,
        "baseLoadKw": 0.8,
        "hasEv": False,
    },
    {
        "id": "HOUSE-06",
        "name": "Birch Estate",
        "address": "105 Sunburst Way",
        "houseNumber": 6,
        "distanceMeters": 210.0,
        "phase": "L3",
        "coords": {"x": 330, "y": 390},
        "hasSolar": True,
        "installedCapacityKw": 8.8,
        "panelCount": 22,
        "panelType": "400W Bifacial Monocrystalline",
        "cellTechnology": "Mono PERC Glass-Glass",
        "moduleWattageW": 400,
        "totalSurfaceAreaM2": 43.0,
        "tiltDeg": 30.0,
        "azimuth": "190° South-South-West",
        "inverterCapacityKw": 8.0,
        "inverterModel": "SolarEdge Energy Hub 7.6kW",
        "hasBattery": False,
        "baseLoadKw": 0.8,
        "hasEv": True,
    },
    {
        "id": "HOUSE-07",
        "name": "Elm Bungalow",
        "address": "107 Sunburst Way",
        "houseNumber": 7,
        "distanceMeters": 250.0,
        "phase": "L1",
        "coords": {"x": 470, "y": 390},
        "hasSolar": True,
        "installedCapacityKw": 5.2,
        "panelCount": 13,
        "panelType": "400W Half-Cut Mono PERC",
        "cellTechnology": "Monocrystalline Half-Cell 144",
        "moduleWattageW": 400,
        "totalSurfaceAreaM2": 25.4,
        "tiltDeg": 25.0,
        "azimuth": "180° True South",
        "inverterCapacityKw": 5.0,
        "inverterModel": "GoodWe GW5000-DNS-30",
        "hasBattery": True,
        "batteryBrand": "SolarEdge Home Battery 10kWh",
        "batteryCapacityKwh": 9.7,
        "initialSoc": 88.0,
        "baseLoadKw": 0.7,
        "hasEv": False,
    },
    {
        "id": "HOUSE-08",
        "name": "Ash Manor (End of Line)",
        "address": "109 Sunburst Way",
        "houseNumber": 8,
        "distanceMeters": 290.0,
        "phase": "L2",
        "coords": {"x": 610, "y": 390},
        "hasSolar": True,
        "installedCapacityKw": 9.6,
        "panelCount": 24,
        "panelType": "400W N-Type TOPCon Dual-Glass",
        "cellTechnology": "N-Type TOPCon Bifacial 16BB",
        "moduleWattageW": 400,
        "totalSurfaceAreaM2": 46.8,
        "tiltDeg": 30.0,
        "azimuth": "180° True South",
        "inverterCapacityKw": 9.0,
        "inverterModel": "SolarEdge SE9000H HD-Wave",
        "hasBattery": True,
        "batteryBrand": "Tesla Powerwall 2 Storage",
        "batteryCapacityKwh": 13.5,
        "initialSoc": 96.0,
        "baseLoadKw": 1.0,
        "hasEv": True,
    },
]


class DomesticDistFlowEngine:
    """
    AC DistFlow / Voltage Gradient Engine for Low-Voltage (230V) Residential Solar Distribution Feeder.
    """

    def solve(
        self,
        time_str: str = "12:30",
        preset: str = "SUNNY_NOON_EXPORT",
        control_action: str = "NONE",
    ) -> DomesticGridNetwork:
        try:
            parts = time_str.split(":")
            hours = float(parts[0]) + float(parts[1]) / 60.0
        except Exception:
            hours = 12.5

        # Solar Irradiance
        irradiance_wm2 = 0.0
        if 6.0 <= hours <= 18.5:
            raw_sin = math.sin(((hours - 6.0) / 12.5) * math.pi)
            irradiance_wm2 = round(980.0 * max(0.0, raw_sin**1.1))

        if preset in ("OVERCAST_IMPORT", "CLOUDY"):
            irradiance_wm2 = round(irradiance_wm2 * 0.28)
        elif preset in ("EVENING_PEAK", "NIGHT_QUIET"):
            irradiance_wm2 = 0.0
        elif preset in ("STORM_CLOUD_RAMP", "STORM"):
            irradiance_wm2 = round(irradiance_wm2 * 0.15)
        elif preset in ("NORMAL_DAY",):
            irradiance_wm2 = round(irradiance_wm2 * 0.72)
        elif preset in ("HIGH_SOLAR_LOW_LOAD", "HIGH_SOLAR", "SUNNY_NOON_EXPORT", "PHASE_UNBALANCE_PEAK", "EXTREME_INFEASIBLE"):
            irradiance_wm2 = max(irradiance_wm2, 950.0)

        ambient_temp_c = round(22.0 + 10.0 * math.sin(((hours - 8.0) / 14.0) * math.pi), 1)
        cell_temp_c = round(ambient_temp_c + ((45.0 - 20.0) / 800.0) * irradiance_wm2, 1)
        temp_derating = max(0.75, 1.0 + (-0.0032 * (cell_temp_c - 25.0)))

        # Load Factor
        load_factor = 0.55
        if 7.0 <= hours <= 9.5:
            load_factor = 0.95 + 0.3 * math.sin(((hours - 7.0) / 2.5) * math.pi)
        elif 11.5 <= hours <= 14.5:
            load_factor = 0.75 + 0.15 * math.sin(((hours - 11.5) / 3.0) * math.pi)
        elif 17.5 <= hours <= 22.5:
            load_factor = 1.45 + 0.65 * math.sin(((hours - 17.5) / 5.0) * math.pi)
        elif hours >= 23.0 or hours <= 5.5:
            load_factor = 0.38

        if preset == "EVENING_PEAK":
            load_factor = max(load_factor, 1.85)
        elif preset == "EV_CHARGING_SURGE":
            load_factor = max(load_factor, 2.10)
        elif preset == "HIGH_SOLAR_LOW_LOAD":
            load_factor = 0.35
        elif preset == "NIGHT_QUIET":
            load_factor = 0.30

        base_tx_v = 230.0
        tap_pos = 0
        tap_ratio = 0.0
        if control_action == "TRANSFORMER_TAP_CHANGE":
            tap_pos = -1
            tap_ratio = -2.5
            base_tx_v = 224.25

        temp_nodes = []
        for raw in RAW_HOUSES:
            has_solar = raw["hasSolar"]
            dc_power = (
                round(raw["installedCapacityKw"] * (irradiance_wm2 / 1000.0) * temp_derating, 2)
                if has_solar
                else 0.0
            )
            inverted_ac = dc_power * 0.994 * 0.982
            gen_kw = min(raw["inverterCapacityKw"], inverted_ac) if has_solar else 0.0
            gen_kw = round(gen_kw, 2)

            curtailed_kw = 0.0
            volt_watt_active = False
            if control_action == "VOLT_WATT_THROTTLE" and has_solar:
                if raw["distanceMeters"] >= 200.0 and gen_kw > 4.8:
                    curtailed_kw = round(gen_kw - 4.8, 2)
                    gen_kw = 4.8
                    volt_watt_active = True

            current_load = round(raw["baseLoadKw"] * load_factor, 2)
            ev_charging = raw["hasEv"] and (18.5 <= hours <= 23.5)
            ev_power = 7.4 if ev_charging else 0.0

            if control_action == "EV_SMART_CHARGING" and raw["hasEv"] and has_solar and gen_kw > 4.0:
                ev_charging = True
                ev_power = 4.2
            current_load = round(current_load + ev_power, 2)

            bat_soc = raw.get("initialSoc", 50.0)
            bat_power = 0.0
            bat_mode = "idle"

            if raw.get("hasBattery"):
                net_no_bat = gen_kw - current_load
                if control_action == "BATTERY_PEAK_SHAVING" and net_no_bat > 0 and bat_soc < 98.0:
                    max_chg = min(4.5, net_no_bat, (99.5 - bat_soc) * 0.2)
                    bat_power = -round(max_chg, 2)
                    bat_mode = "charge"
                    bat_soc = min(100.0, round(bat_soc + 1.2, 1))
                elif net_no_bat > 0.5 and bat_soc < 96.0:
                    chg = min(4.0, net_no_bat * 0.8)
                    bat_power = -round(chg, 2)
                    bat_mode = "charge"
                elif net_no_bat < -0.5 and bat_soc > 15.0 and hours >= 17.0:
                    dischg = min(4.0, abs(net_no_bat))
                    bat_power = round(dischg, 2)
                    bat_mode = "discharge"
                    bat_soc = max(10.0, round(bat_soc - 1.1, 1))

            solar_direct = min(gen_kw, current_load)
            bat_direct = min(bat_power, current_load - solar_direct) if bat_power > 0 else 0.0
            grid_direct = max(0.0, current_load - solar_direct - bat_direct)

            net_power = round(gen_kw - current_load + bat_power, 2)
            flow_dir = (
                "export"
                if net_power > 0.05
                else "import"
                if net_power < -0.05
                else "self_sufficient"
            )

            p2p_shared = round(min(1.6, net_power * 0.35), 2) if flow_dir == "export" else 0.0
            grid_export = round(net_power - p2p_shared, 2) if flow_dir == "export" else 0.0
            grid_import = abs(net_power) if flow_dir == "import" else 0.0

            self_cons = (
                min(100.0, round(((gen_kw - grid_export) / gen_kw) * 100.0, 1))
                if gen_kw > 0
                else 0.0
            )

            phase = raw["phase"]
            if control_action == "PHASE_REBALANCING":
                if raw["id"] == "HOUSE-08":
                    phase = "L1"
                elif raw["id"] == "HOUSE-05":
                    phase = "L3"

            volt_var_active = (
                control_action == "VOLT_VAR_DROOP" and has_solar and gen_kw > 1.5
            )

            temp_nodes.append(
                {
                    "raw": raw,
                    "phase": phase,
                    "gen_kw": gen_kw,
                    "dc_power": dc_power,
                    "curtailed_kw": curtailed_kw,
                    "volt_watt_active": volt_watt_active,
                    "volt_var_active": volt_var_active,
                    "current_load": current_load,
                    "solar_direct": solar_direct,
                    "bat_direct": bat_direct,
                    "grid_direct": grid_direct,
                    "ev_charging": ev_charging,
                    "ev_power": ev_power,
                    "bat_soc": bat_soc,
                    "bat_power": bat_power,
                    "bat_mode": bat_mode,
                    "net_power": net_power,
                    "flow_dir": flow_dir,
                    "p2p_shared": p2p_shared,
                    "grid_export": grid_export,
                    "grid_import": grid_import,
                    "self_cons": self_cons,
                }
            )

        # Three-Phase Voltage Solver along Feeder
        v_l1 = base_tx_v
        v_l2 = base_tx_v
        v_l3 = base_tx_v
        prev_dist = 0.0

        houses: List[HouseNode] = []
        violations: List[DomesticGridViolation] = []

        distances = [30.0, 65.0, 100.0, 135.0, 170.0, 210.0, 250.0, 290.0]

        for idx, node in enumerate(temp_nodes):
            raw = node["raw"]
            dist = distances[idx]
            seg_len_km = (dist - prev_dist) / 1000.0
            prev_dist = dist

            down_l1 = sum(n["net_power"] for n in temp_nodes[idx:] if n["phase"] == "L1")
            down_l2 = sum(n["net_power"] for n in temp_nodes[idx:] if n["phase"] == "L2")
            down_l3 = sum(n["net_power"] for n in temp_nodes[idx:] if n["phase"] == "L3")

            r_eff = 0.88 * seg_len_km
            x_eff = 0.10 * seg_len_km

            q_l1 = down_l1 * 0.15
            q_l2 = down_l2 * 0.15
            q_l3 = down_l3 * 0.15

            if control_action == "VOLT_VAR_DROOP":
                if down_l1 > 0:
                    q_l1 = -0.44 * down_l1
                if down_l2 > 0:
                    q_l2 = -0.44 * down_l2
                if down_l3 > 0:
                    q_l3 = -0.44 * down_l3

            v_l1 += ((r_eff * down_l1 * 1000.0) + (x_eff * q_l1 * 1000.0)) / 230.0
            v_l2 += ((r_eff * down_l2 * 1000.0) + (x_eff * q_l2 * 1000.0)) / 230.0
            v_l3 += ((r_eff * down_l3 * 1000.0) + (x_eff * q_l3 * 1000.0)) / 230.0

            # Service drop cable from street pole into house switchboard (16mm² Cu drop cable, R ~ 0.46 Ohm)
            r_service_drop = 0.46
            x_service_drop = 0.05
            drop_q = -0.44 * node["net_power"] if node["volt_var_active"] else 0.15 * node["net_power"]
            delta_v_drop = ((r_service_drop * node["net_power"] * 1000.0) + (x_service_drop * drop_q * 1000.0)) / 230.0

            pole_v = v_l1 if node["phase"] == "L1" else (v_l2 if node["phase"] == "L2" else v_l3)
            terminal_v = round(pole_v + delta_v_drop, 1)
            terminal_pu = round(terminal_v / 230.0, 3)

            v_avg = (v_l1 + v_l2 + v_l3) / 3.0
            max_dev = max(abs(v_l1 - v_avg), abs(v_l2 - v_avg), abs(v_l3 - v_avg))
            vuf = round((max_dev / v_avg) * 100.0, 1)

            status = ComponentStatus.NORMAL
            if terminal_v > 253.0:
                status = ComponentStatus.CRITICAL
                violations.append(
                    DomesticGridViolation(
                        id=f"VIO-DOM-{raw['id']}-OV",
                        houseId=raw["id"],
                        houseName=raw["name"],
                        type="over_voltage",
                        severity="critical",
                        message=f"Over-voltage violation ({terminal_v}V > 253.0V limit) caused by rooftop solar export",
                        standardRef="IEEE 1547-2018 / EN 50160",
                        currentValue=terminal_v,
                        thresholdValue=253.0,
                        unit="V",
                        timestamp=time_str,
                        resolvingActionHint="Enable Volt-VAR Inverter Control or Battery Peak Shaving.",
                    )
                )
            elif terminal_v > 248.0:
                status = ComponentStatus.WARNING

            rooftop = RooftopSolarSystem(
                hasSolar=raw["hasSolar"],
                installedCapacityKw=raw["installedCapacityKw"],
                panelCount=raw["panelCount"],
                panelType=raw["panelType"],
                cellTechnology=raw.get("cellTechnology", "Mono PERC"),
                moduleWattageW=raw.get("moduleWattageW", 400),
                totalSurfaceAreaM2=raw.get("totalSurfaceAreaM2", 25.0),
                tiltDeg=raw["tiltDeg"],
                azimuth=raw["azimuth"],
                irradianceWm2=irradiance_wm2,
                ambientTempC=ambient_temp_c,
                cellTemperatureC=cell_temp_c,
                dcPowerGeneratedKw=node["dc_power"],
                inverterCapacityKw=raw["inverterCapacityKw"],
                inverterModel=raw.get("inverterModel", "Standard Inverter"),
                inverterAcPowerKw=node["gen_kw"],
                inverterAcCurrentA=round(node["gen_kw"] * 1000.0 / 230.0, 1) if node["gen_kw"] > 0 else 0.0,
                inverterDcVoltageV=round(360.0 + 50.0 * (irradiance_wm2 / 1000.0), 1) if raw["hasSolar"] else 0.0,
                inverterDcCurrentA=round((node["dc_power"] * 1000.0) / 380.0, 2) if node["dc_power"] > 0 else 0.0,
                curtailedKw=node["curtailed_kw"],
                curtailmentPercent=round((node["curtailed_kw"] / (node["gen_kw"] + node["curtailed_kw"])) * 100.0, 1) if node["gen_kw"] > 0 else 0.0,
                voltVarActive=node["volt_var_active"],
                voltWattActive=node["volt_watt_active"],
                operatingPowerFactor=0.91 if node["volt_var_active"] else 0.99,
                reactivePowerKvar=-round(node["gen_kw"] * 0.44, 2) if node["volt_var_active"] else 0.12,
                currentGenerationKw=node["gen_kw"],
                dailyYieldKwh=round(node["gen_kw"] * 5.5, 1),
                monthlyYieldKwh=round(node["gen_kw"] * 165.0, 1),
                lifetimeMwh=round(node["gen_kw"] * 3.2, 1),
                avoidedCo2Kg=round(node["gen_kw"] * 4.4, 1),
            )

            battery = (
                HomeBatterySystem(
                    installed=True,
                    brand=raw.get("batteryBrand", "Tesla Powerwall 2"),
                    capacityKwh=raw.get("batteryCapacityKwh", 13.5),
                    usableCapacityKwh=raw.get("batteryCapacityKwh", 13.5),
                    currentSocPercent=node["bat_soc"],
                    maxChargeKw=5.0,
                    maxDischargeKw=5.0,
                    currentPowerKw=node["bat_power"],
                    mode=node["bat_mode"],
                )
                if raw.get("hasBattery")
                else None
            )

            consumption = DomesticConsumption(
                currentLoadKw=node["current_load"],
                baseLoadKw=raw["baseLoadKw"],
                dailyConsumptionKwh=round(node["current_load"] * 12.0, 1),
                solarSelfConsumedKw=node["solar_direct"],
                batterySelfConsumedKw=node["bat_direct"],
                gridImportConsumedKw=node["grid_direct"],
                hasEv=raw["hasEv"],
                evCharging=node["ev_charging"],
                evPowerKw=node["ev_power"],
                evSocPercent=75.0 if raw["hasEv"] else None,
                activeAppliances=[
                    ApplianceItem(
                        id=f"app-{raw['houseNumber']}-1",
                        name="Inverter Refrigerator",
                        powerKw=0.25,
                        category="kitchen",
                        powerSource="solar" if node["solar_direct"] > 0 else "grid",
                    ),
                    ApplianceItem(
                        id=f"app-{raw['houseNumber']}-2",
                        name="HVAC Inverter Cooling",
                        powerKw=round(max(0.4, node["current_load"] - 0.5), 2),
                        category="hvac",
                        powerSource="solar" if node["solar_direct"] > 0.5 else "grid",
                    ),
                ],
            )

            telemetry = DomesticTelemetry(
                voltageV=terminal_v,
                voltagePu=terminal_pu,
                phaseVoltageL1=round(v_l1, 1),
                phaseVoltageL2=round(v_l2, 1),
                phaseVoltageL3=round(v_l3, 1),
                voltageUnbalanceFactorPercent=vuf,
                currentAmps=round(abs(node["net_power"] * 1000.0) / terminal_v, 1),
                netPowerKw=node["net_power"],
                flowDirection=node["flow_dir"],
                status=status,
                selfConsumptionPercent=node["self_cons"],
                p2pSharedKw=node["p2p_shared"],
                gridExportKw=node["grid_export"],
                gridImportKw=node["grid_import"],
                dailyCostSavings=round(node["gen_kw"] * 1.1, 2),
                lineLossesKw=round(abs(node["net_power"]) * 0.03, 2),
            )

            houses.append(
                HouseNode(
                    id=raw["id"],
                    name=raw["name"],
                    address=raw["address"],
                    houseNumber=raw["houseNumber"],
                    distanceMeters=raw["distanceMeters"],
                    phase=node["phase"],
                    coords=Coords(x=raw["coords"]["x"], y=raw["coords"]["y"]),
                    rooftopSolar=rooftop,
                    battery=battery,
                    consumption=consumption,
                    telemetry=telemetry,
                )
            )

        total_gen = round(sum(h.rooftopSolar.currentGenerationKw for h in houses), 2)
        total_load = round(sum(h.consumption.currentLoadKw for h in houses), 2)
        total_bat = round(sum(h.battery.currentPowerKw for h in houses if h.battery), 2)
        net_grid_kw = round(total_gen - total_load + total_bat, 2)

        tx_load_kw = abs(net_grid_kw)
        tx_load_kva = round(tx_load_kw / 0.96, 1)
        tx_loading_pct = round((tx_load_kva / 100.0) * 100.0, 1)

        transformer = DomesticTransformer(
            id="TX-LV-01",
            name="Pole-Mounted Distribution Transformer",
            ratingKva=100.0,
            primaryVoltageKv=11.0,
            secondaryVoltageV=230.0,
            currentLoadKw=tx_load_kw,
            currentLoadKva=tx_load_kva,
            loadingPercent=tx_loading_pct,
            flowDirection="reverse_export_to_grid" if net_grid_kw > 0 else "import_from_grid",
            tapPosition=tap_pos,
            tapRatioPercent=tap_ratio,
            status=ComponentStatus.CRITICAL if tx_loading_pct > 100.0 else ComponentStatus.NORMAL,
        )

        segments = [
            StreetSegment(
                id=f"SEG-0{i}",
                fromNode=houses[i - 1].id if i > 0 else "TX-LV-01",
                toNode=houses[i].id,
                lengthMeters=35.0,
                cableType="4x70mm² Cu XLPE",
                rOhm=0.015,
                xOhm=0.003,
                currentAmps=round(abs(sum(h.telemetry.netPowerKw for h in houses[i:]) * 1000.0) / 230.0, 1),
                voltageDropV=2.1,
                loadingPercent=35.0,
                status=ComponentStatus.NORMAL,
            )
            for i in range(len(houses))
        ]

        voltages = [h.telemetry.voltageV for h in houses]
        over_v = len([v for v in voltages if v > 253.0])
        under_v = len([v for v in voltages if v < 216.0])
        total_storage = sum(h.battery.capacityKwh for h in houses if h.battery)
        bats = [h.battery for h in houses if h.battery]
        avg_soc = round(sum(b.currentSocPercent for b in bats) / len(bats), 1) if bats else 0.0

        return DomesticGridNetwork(
            transformer=transformer,
            houses=houses,
            segments=segments,
            timestamp=time_str,
            totalGenerationKw=total_gen,
            totalLoadKw=total_load,
            netGridExchangeKw=net_grid_kw,
            peakVoltageV=max(voltages),
            lowestVoltageV=min(voltages),
            averageVoltageV=round(sum(voltages) / len(voltages), 1),
            overVoltageHousesCount=over_v,
            underVoltageHousesCount=under_v,
            phaseUnbalanceMaxPercent=max([h.telemetry.voltageUnbalanceFactorPercent for h in houses]),
            selfConsumptionRatePercent=min(100.0, round(((total_gen - max(0.0, net_grid_kw)) / total_gen) * 100.0, 1)) if total_gen > 0 else 0.0,
            totalStorageKwh=total_storage,
            averageBatterySocPercent=avg_soc,
            p2pEnergyExchangedKw=round(sum(h.telemetry.p2pSharedKw for h in houses), 2),
            totalLineLossesKw=round(sum(h.telemetry.lineLossesKw for h in houses), 2),
            violations=violations,
        )
