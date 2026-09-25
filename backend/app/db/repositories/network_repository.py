import datetime
from typing import Optional
from app.db.supabase import get_supabase_client
from app.schemas.network import (
    GridNetwork, Bus, Feeder, SolarUnit, Battery, Load, Transformer, BusConnectedAssets
)
from app.core.logging import logger

_DEFAULT_NETWORK: Optional[GridNetwork] = None


def get_default_network() -> GridNetwork:
    global _DEFAULT_NETWORK
    if _DEFAULT_NETWORK is not None:
        return _DEFAULT_NETWORK

    substation = Transformer(
        id="TX-MAIN",
        name="Primary Substation (33/11 kV)",
        ratingKva=500.0,
        primaryVoltageKv=33.0,
        secondaryVoltageKv=11.0,
        loadingPercent=68.4,
        temperatureC=38.5,
        status="normal",
    )

    buses = [
        Bus(
            id="B1",
            name="Bus 1",
            voltage=1.02,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=0.0,
            solarKw=0.0,
            lineLoadingPercent=64.0,
            temperatureC=32.0,
            status="normal",
            connectedFeeders=["F-01", "F-LINE-12"],
            connectedAssets=BusConnectedAssets(),
        ),
        Bus(
            id="B2",
            name="Bus 2",
            voltage=1.01,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=90.0,
            solarKw=150.0,
            lineLoadingPercent=82.0,
            temperatureC=35.0,
            status="normal",
            connectedFeeders=["F-LINE-12", "F-02"],
            connectedAssets=BusConnectedAssets(solar="SOLAR-01", load="LOAD-01"),
        ),
        Bus(
            id="B3",
            name="Bus 3",
            voltage=1.074,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=60.0,
            solarKw=80.0,
            lineLoadingPercent=108.0,
            temperatureC=42.0,
            status="critical",
            connectedFeeders=["F-02", "F-04", "F-03"],
            connectedAssets=BusConnectedAssets(battery="BAT-01", load="LOAD-02", solar="SOLAR-02"),
        ),
        Bus(
            id="B4",
            name="Bus 4",
            voltage=1.00,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=120.0,
            solarKw=0.0,
            lineLoadingPercent=52.0,
            temperatureC=31.0,
            status="normal",
            connectedFeeders=["F-04"],
            connectedAssets=BusConnectedAssets(load="LOAD-03"),
        ),
    ]

    feeders = [
        Feeder(
            id="F-01",
            name="Feeder F-01",
            fromBus="TX-MAIN",
            toBus="B1",
            loadingPercent=64.0,
            loadingLimitPercent=100.0,
            capacityKw=600.0,
            activePowerKw=384.0,
            reactivePowerKvar=72.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-LINE-12",
            name="Feeder Line 1-2",
            fromBus="B1",
            toBus="B2",
            loadingPercent=78.0,
            loadingLimitPercent=100.0,
            capacityKw=450.0,
            activePowerKw=351.0,
            reactivePowerKvar=60.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-02",
            name="Feeder F-02",
            fromBus="B2",
            toBus="B3",
            loadingPercent=108.0,
            loadingLimitPercent=100.0,
            capacityKw=300.0,
            activePowerKw=324.0,
            reactivePowerKvar=85.0,
            status="critical",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-03",
            name="Feeder F-03 (Tie-Line)",
            fromBus="B1",
            toBus="B3",
            loadingPercent=0.0,
            loadingLimitPercent=100.0,
            capacityKw=350.0,
            activePowerKw=0.0,
            reactivePowerKvar=0.0,
            status="normal",
            isSwitchClosed=False,
            isReconfigurableAlternate=True,
        ),
        Feeder(
            id="F-04",
            name="Feeder F-04",
            fromBus="B3",
            toBus="B4",
            loadingPercent=52.0,
            loadingLimitPercent=100.0,
            capacityKw=250.0,
            activePowerKw=130.0,
            reactivePowerKvar=28.0,
            status="normal",
            isSwitchClosed=True,
        ),
    ]

    solar_units = [
        SolarUnit(
            id="SOLAR-01",
            name="Solar Farm Alpha",
            busId="B2",
            generationKw=150.0,
            capacityKw=250.0,
            irradianceWm2=895.0,
            curtailedKw=0.0,
            status="normal",
        ),
        SolarUnit(
            id="SOLAR-02",
            name="Rooftop Solar B3",
            busId="B3",
            generationKw=80.0,
            capacityKw=100.0,
            irradianceWm2=890.0,
            curtailedKw=0.0,
            status="warning",
        ),
    ]

    batteries = [
        Battery(
            id="BAT-01",
            name="BESS Unit 1",
            busId="B3",
            powerKw=40.0,
            maxDischargeKw=60.0,
            maxChargeKw=60.0,
            socPercent=62.0,
            capacityKwh=100.0,
            status="normal",
            cycleCount=312,
        )
    ]

    loads = [
        Load(
            id="LOAD-01",
            name="Commercial Complex Load",
            busId="B2",
            powerKw=90.0,
            powerFactor=0.94,
            status="normal",
        ),
        Load(
            id="LOAD-02",
            name="Residential Sub-district A",
            busId="B3",
            powerKw=60.0,
            powerFactor=0.92,
            status="normal",
        ),
        Load(
            id="LOAD-03",
            name="Industrial Park Load",
            busId="B4",
            powerKw=120.0,
            powerFactor=0.89,
            status="normal",
        ),
    ]

    _DEFAULT_NETWORK = GridNetwork(
        gridConnectionStatus="connected",
        gridFrequencyHz=50.02,
        substation=substation,
        buses=buses,
        feeders=feeders,
        solarUnits=solar_units,
        batteries=batteries,
        loads=loads,
        lastUpdated=datetime.datetime.now().isoformat(),
    )
    return _DEFAULT_NETWORK


class NetworkRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def get_network(self) -> GridNetwork:
        base_net = get_default_network()
        from app.services.simulation_service import get_active_power_flow
        active_pf = get_active_power_flow()
        if not active_pf:
            return base_net

        updated_solar = [
            s.model_copy(update={
                "generationKw": round(active_pf.totalGenerationKw * (0.65 if s.id == "SOLAR-01" else 0.35), 1)
            })
            for s in base_net.solarUnits
        ]

        updated_loads = [
            l.model_copy(update={
                "powerKw": round(active_pf.totalDemandKw * (0.4 if l.id == "LOAD-01" else 0.3), 1)
            })
            for l in base_net.loads
        ]

        updated_batteries = [
            b.model_copy(update={
                "socPercent": active_pf.batterySocPercent if active_pf.batterySocPercent is not None else b.socPercent
            })
            for b in base_net.batteries
        ]

        f01 = next((f for f in active_pf.feeders if f.id == "F-01"), None)
        updated_substation = base_net.substation.model_copy(update={
            "loadingPercent": f01.loadingPercent if f01 else base_net.substation.loadingPercent
        })

        return GridNetwork(
            gridConnectionStatus="connected",
            gridFrequencyHz=50.02,
            substation=updated_substation,
            buses=active_pf.buses,
            feeders=active_pf.feeders,
            solarUnits=updated_solar,
            batteries=updated_batteries,
            loads=updated_loads,
            lastUpdated=datetime.datetime.now().isoformat(),
        )

    async def get_bus(self, bus_id: str) -> Optional[Bus]:
        net = await self.get_network()
        for b in net.buses:
            if b.id == bus_id:
                return b
        return None

    async def get_feeder(self, feeder_id: str) -> Optional[Feeder]:
        net = await self.get_network()
        for f in net.feeders:
            if f.id == feeder_id:
                return f
        return None
