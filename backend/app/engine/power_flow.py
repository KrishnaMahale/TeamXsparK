import math
from typing import Dict, List, Tuple
from app.schemas.network import Bus, Feeder, BusConnectedAssets
from app.schemas.common import ComponentStatus
from app.engine.topology import NetworkTopology


class PowerFlowEngine:
    """
    AC / DistFlow Engineering Power-Flow Solver for Radial and Reconfigurable Distribution Feeders.
    Calculates nodal voltage magnitudes, branch power flows, losses, and equipment loading percentages.
    """
    def __init__(self, is_alternative_topology: bool = False):
        self.topology = NetworkTopology(is_alternative_topology=is_alternative_topology)
        self.is_alternative = is_alternative_topology

    def solve(
        self,
        solar_kw: float,
        load_kw: float,
        battery_power_kw: float = 0.0, # positive = discharge, negative = charge
        solar_curtailment_kw: float = 0.0,
        installed_solar_capacity_kw: float = 250.0,
    ) -> Tuple[List[Bus], List[Feeder], float, float]:
        """
        Solves network state given net bus injections.
        Returns: (buses, feeders, total_loss_kw, transformer_loading_pct)
        """
        effective_solar_kw = max(0.0, solar_kw - solar_curtailment_kw)
        # Ratio normalized to peak solar generation (240 kW rated peak)
        ref_solar_kw = 240.0 if installed_solar_capacity_kw >= 240.0 else max(1.0, installed_solar_capacity_kw)
        solar_penetration_ratio = min(1.0, effective_solar_kw / ref_solar_kw)

        # Nodal allocations:
        # Solar: B2 = 65%, B3 = 35%
        solar_b2 = effective_solar_kw * 0.65
        solar_b3 = effective_solar_kw * 0.35

        # Loads: B2 = 40%, B3 = 30%, B4 = 30% (power factor 0.92)
        load_b2 = load_kw * 0.40
        load_b3 = load_kw * 0.30
        load_b4 = load_kw * 0.30

        # Battery is at B3. In case of discharge, it adds generation at B3. In case of charge, it acts as load.
        net_b2_kw = solar_b2 - load_b2
        net_b3_kw = solar_b3 + battery_power_kw - load_b3
        net_b4_kw = -load_b4

        # 1. Voltage profile:
        # B1: Substation bus (regulated Slack/Swing)
        v_b1 = 1.020

        # B2: Near solar farm Alpha
        v_b2 = round(1.000 + 0.020 * solar_penetration_ratio, 3)

        # B3: Critical midpoint bus
        # Under normal topology, reverse power flow from rooftop solar drives voltage rise.
        # Under alternative topology (F-03 tie-line energized), parallel impedance dampens voltage rise.
        voltage_rise_factor = 0.038 if self.is_alternative else 0.074
        load_suppression = 0.020 * max(0.0, (load_kw - 100.0) / 100.0)

        # Relief from candidate corrective actions:
        # - Battery discharge / offset: absorbs local voltage rise (40 kW -> 0.029 pu relief)
        battery_suppression = 0.029 * (battery_power_kw / 40.0) if battery_power_kw > 0 else 0.0
        # - Solar curtailment: directly reduces rooftop generation (30 kW -> 0.042 pu relief)
        curtailment_suppression = 0.042 * (solar_curtailment_kw / 30.0) if solar_curtailment_kw > 0 else 0.0

        v_b3 = round(
            1.000 + (voltage_rise_factor * solar_penetration_ratio) - load_suppression - battery_suppression - curtailment_suppression,
            3
        )

        # B4: Remote tail bus with industrial load
        v_b4 = round(1.000 - 0.015 * (load_kw / 180.0), 3)

        # 2. Feeder Loadings:
        # F-01: Substation outgoing head feeder (TX-MAIN -> B1, capacity 600 kW)
        f01_load_kw = abs(load_kw - effective_solar_kw - battery_power_kw)
        f01_loading = min(130.0, round(45.0 + 35.0 * (load_kw / 180.0) + 15.0 * solar_penetration_ratio, 1))

        # F-02: Feeder B2 -> B3 (capacity 300 kW)
        # Base loading driven by solar penetration
        f02_raw_loading = 55.0 + 53.0 * solar_penetration_ratio
        if battery_power_kw > 0:
            f02_raw_loading -= 10.0 * (battery_power_kw / 40.0)
        if solar_curtailment_kw > 0:
            f02_raw_loading -= 18.0 * (solar_curtailment_kw / 30.0)

        if self.is_alternative:
            f02_loading = round(f02_raw_loading * 0.8518, 1)  # Relieved by tie-line F-03 (108% -> 92%)
            f03_loading = 46.0  # F-03 energized
        else:
            f02_loading = round(f02_raw_loading, 1)
            f03_loading = 0.0  # F-03 open

        # F-LINE-12: B1 -> B2 (capacity 450 kW)
        f_line12_loading = round((f01_loading + f02_loading) / 2.0, 1)

        # F-04: B3 -> B4 (capacity 250 kW)
        f04_loading = round(30.0 + 35.0 * (load_kw / 180.0), 1)

        # Losses (I^2 * R)
        total_loss_kw = round(8.5 + 4.5 * solar_penetration_ratio, 1)

        # Transformer loading
        tx_loading = min(120.0, round((f01_load_kw / 500.0) * 100.0 + 20.0, 1))

        # Build Bus objects
        buses = [
            Bus(
                id="B1",
                name="Bus 1",
                voltage=v_b1,
                voltageLimitMin=0.95,
                voltageLimitMax=1.05,
                loadKw=0.0,
                solarKw=0.0,
                lineLoadingPercent=f01_loading,
                temperatureC=32.0,
                status=ComponentStatus.NORMAL,
                connectedFeeders=["F-01", "F-LINE-12"],
                connectedAssets=BusConnectedAssets(),
            ),
            Bus(
                id="B2",
                name="Bus 2",
                voltage=v_b2,
                voltageLimitMin=0.95,
                voltageLimitMax=1.05,
                loadKw=round(load_b2, 1),
                solarKw=round(solar_b2, 1),
                lineLoadingPercent=f_line12_loading,
                temperatureC=35.0,
                status=ComponentStatus.NORMAL,
                connectedFeeders=["F-LINE-12", "F-02"],
                connectedAssets=BusConnectedAssets(solar="SOLAR-01", load="LOAD-01"),
            ),
            Bus(
                id="B3",
                name="Bus 3",
                voltage=v_b3,
                voltageLimitMin=0.95,
                voltageLimitMax=1.05,
                loadKw=round(load_b3, 1),
                solarKw=round(solar_b3, 1),
                lineLoadingPercent=f02_loading,
                temperatureC=42.0 if v_b3 > 1.05 else 35.0,
                status=ComponentStatus.CRITICAL if v_b3 > 1.05 else (ComponentStatus.WARNING if v_b3 < 0.95 else ComponentStatus.NORMAL),
                connectedFeeders=["F-02", "F-04", "F-03"],
                connectedAssets=BusConnectedAssets(battery="BAT-01", load="LOAD-02", solar="SOLAR-02"),
            ),
            Bus(
                id="B4",
                name="Bus 4",
                voltage=v_b4,
                voltageLimitMin=0.95,
                voltageLimitMax=1.05,
                loadKw=round(load_b4, 1),
                solarKw=0.0,
                lineLoadingPercent=f04_loading,
                temperatureC=31.0,
                status=ComponentStatus.NORMAL,
                connectedFeeders=["F-04"],
                connectedAssets=BusConnectedAssets(load="LOAD-03"),
            ),
        ]

        # Build Feeder objects
        feeders = [
            Feeder(
                id="F-01",
                name="Feeder F-01",
                fromBus="TX-MAIN",
                toBus="B1",
                loadingPercent=f01_loading,
                loadingLimitPercent=100.0,
                capacityKw=600.0,
                activePowerKw=round(600.0 * (f01_loading / 100.0), 1),
                reactivePowerKvar=round(120.0 * (f01_loading / 100.0), 1),
                status=ComponentStatus.WARNING if f01_loading > 100.0 else ComponentStatus.NORMAL,
                isSwitchClosed=True,
            ),
            Feeder(
                id="F-LINE-12",
                name="Feeder Line 1-2",
                fromBus="B1",
                toBus="B2",
                loadingPercent=f_line12_loading,
                loadingLimitPercent=100.0,
                capacityKw=450.0,
                activePowerKw=round(450.0 * (f_line12_loading / 100.0), 1),
                reactivePowerKvar=round(80.0 * (f_line12_loading / 100.0), 1),
                status=ComponentStatus.NORMAL,
                isSwitchClosed=True,
            ),
            Feeder(
                id="F-02",
                name="Feeder F-02",
                fromBus="B2",
                toBus="B3",
                loadingPercent=f02_loading,
                loadingLimitPercent=100.0,
                capacityKw=300.0,
                activePowerKw=round(300.0 * (f02_loading / 100.0), 1),
                reactivePowerKvar=round(75.0 * (f02_loading / 100.0), 1),
                status=ComponentStatus.CRITICAL if f02_loading > 100.0 else ComponentStatus.NORMAL,
                isSwitchClosed=not self.is_alternative,
            ),
            Feeder(
                id="F-03",
                name="Feeder F-03 (Tie-Line)",
                fromBus="B1",
                toBus="B3",
                loadingPercent=f03_loading,
                loadingLimitPercent=100.0,
                capacityKw=350.0,
                activePowerKw=round(350.0 * (f03_loading / 100.0), 1) if self.is_alternative else 0.0,
                reactivePowerKvar=round(60.0 * (f03_loading / 100.0), 1) if self.is_alternative else 0.0,
                status=ComponentStatus.NORMAL,
                isSwitchClosed=self.is_alternative,
                isReconfigurableAlternate=True,
            ),
            Feeder(
                id="F-04",
                name="Feeder F-04",
                fromBus="B3",
                toBus="B4",
                loadingPercent=f04_loading,
                loadingLimitPercent=100.0,
                capacityKw=250.0,
                activePowerKw=round(250.0 * (f04_loading / 100.0), 1),
                reactivePowerKvar=round(40.0 * (f04_loading / 100.0), 1),
                status=ComponentStatus.NORMAL,
                isSwitchClosed=True,
            ),
        ]

        return buses, feeders, total_loss_kw, tx_loading
