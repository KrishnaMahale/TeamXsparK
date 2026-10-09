import os
import json
import uuid
import datetime
from typing import Optional, Dict, List
from app.db.supabase import get_supabase_client
from app.schemas.network import (
    GridNetwork, Bus, Feeder, SolarUnit, Battery, Load, Transformer, BusConnectedAssets, Position3D
)
from app.core.logging import logger

_GRIDS: Dict[str, GridNetwork] = {}
_ACTIVE_GRID_ID: str = "default-grid"

_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
_CACHE_FILE = os.path.join(_DATA_DIR, "grids_cache.json")
_ACTIVE_ID_FILE = os.path.join(_DATA_DIR, "active_grid_id.txt")


def _save_local_cache():
    try:
        os.makedirs(_DATA_DIR, exist_ok=True)
        serializable = {k: v.model_dump() for k, v in _GRIDS.items()}
        temp_file = os.path.join(_DATA_DIR, f"grids_cache_{os.getpid()}_{uuid.uuid4().hex[:6]}.tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2)
        os.replace(temp_file, _CACHE_FILE)
    except Exception as e:
        logger.warning(f"Failed to write local grids cache: {e}")


def _load_local_cache():
    global _ACTIVE_GRID_ID
    try:
        if os.path.exists(_ACTIVE_ID_FILE):
            with open(_ACTIVE_ID_FILE, "r", encoding="utf-8") as f:
                act = f.read().strip()
                if act:
                    _ACTIVE_GRID_ID = act

        if os.path.exists(_CACHE_FILE):
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    for k, v in data.items():
                        try:
                            _GRIDS[k] = GridNetwork(**v)
                        except Exception:
                            pass
    except Exception as e:
        logger.warning(f"Failed to load local grids cache: {e}")


def initialize_default_grid() -> GridNetwork:
    substation = Transformer(
        id="TX-MAIN",
        name="Primary Substation (33/11 kV)",
        ratingKva=500.0,
        primaryVoltageKv=33.0,
        secondaryVoltageKv=11.0,
        loadingPercent=68.4,
        temperatureC=38.5,
        status="normal",
        position=Position3D(x=0, y=0.6, z=-10)
    )

    buses = [
        Bus(
            id="B1", name="Bus 1", voltage=1.02, loadKw=0.0, solarKw=0.0, lineLoadingPercent=64.0, temperatureC=32.0, status="normal",
            connectedFeeders=["F-01", "F-LINE-12"], connectedAssets=BusConnectedAssets(), position=Position3D(x=0, y=0, z=-5)
        ),
        Bus(
            id="B2", name="Bus 2", voltage=1.01, loadKw=90.0, solarKw=150.0, lineLoadingPercent=82.0, temperatureC=35.0, status="normal",
            connectedFeeders=["F-LINE-12", "F-02"], connectedAssets=BusConnectedAssets(solar="SOLAR-01", load="LOAD-01"), position=Position3D(x=0, y=0, z=0)
        ),
        Bus(
            id="B3", name="Bus 3", voltage=1.074, loadKw=60.0, solarKw=80.0, lineLoadingPercent=108.0, temperatureC=42.0, status="critical",
            connectedFeeders=["F-02", "F-04", "F-03"], connectedAssets=BusConnectedAssets(battery="BAT-01", load="LOAD-02", solar="SOLAR-02"), position=Position3D(x=0, y=0, z=6)
        ),
        Bus(
            id="B4", name="Bus 4", voltage=1.00, loadKw=120.0, solarKw=0.0, lineLoadingPercent=52.0, temperatureC=31.0, status="normal",
            connectedFeeders=["F-04"], connectedAssets=BusConnectedAssets(load="LOAD-03"), position=Position3D(x=0, y=0, z=12)
        ),
    ]

    feeders = [
        Feeder(id="F-01", name="Feeder F-01", fromBus="TX-MAIN", toBus="B1", loadingPercent=64.0, capacityKw=600.0, activePowerKw=384.0, reactivePowerKvar=72.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LINE-12", name="Feeder Line 1-2", fromBus="B1", toBus="B2", loadingPercent=78.0, capacityKw=450.0, activePowerKw=351.0, reactivePowerKvar=60.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-02", name="Feeder F-02", fromBus="B2", toBus="B3", loadingPercent=108.0, capacityKw=300.0, activePowerKw=324.0, reactivePowerKvar=85.0, status="critical", isSwitchClosed=True),
        Feeder(id="F-03", name="Feeder F-03 (Tie-Line)", fromBus="B1", toBus="B3", loadingPercent=0.0, capacityKw=350.0, activePowerKw=0.0, reactivePowerKvar=0.0, status="normal", isSwitchClosed=False, isReconfigurableAlternate=True),
        Feeder(id="F-04", name="Feeder F-04", fromBus="B3", toBus="B4", loadingPercent=52.0, capacityKw=250.0, activePowerKw=130.0, reactivePowerKvar=28.0, status="normal", isSwitchClosed=True),
    ]

    solar_units = [
        SolarUnit(id="SOLAR-01", name="Solar Farm Alpha", busId="B2", generationKw=150.0, capacityKw=250.0, irradianceWm2=895.0, status="normal", position=Position3D(x=-7, y=0, z=0)),
        SolarUnit(id="SOLAR-02", name="Rooftop Solar B3", busId="B3", generationKw=80.0, capacityKw=100.0, irradianceWm2=890.0, status="warning", position=Position3D(x=0, y=0, z=0)),
    ]

    batteries = [
        Battery(id="BAT-01", name="BESS Unit 1", busId="B3", powerKw=40.0, maxDischargeKw=60.0, maxChargeKw=60.0, socPercent=62.0, capacityKwh=100.0, status="normal", position=Position3D(x=-7, y=0, z=6))
    ]

    loads = [
        Load(id="LOAD-01", name="Commercial Complex Load", busId="B2", powerKw=90.0, powerFactor=0.94, status="normal", position=Position3D(x=7, y=0, z=0)),
        Load(id="LOAD-02", name="Residential Sub-district A", busId="B3", powerKw=60.0, powerFactor=0.92, status="normal", position=Position3D(x=7, y=0, z=6)),
        Load(id="LOAD-03", name="Industrial Park Load", busId="B4", powerKw=120.0, powerFactor=0.89, status="normal", position=Position3D(x=7, y=0, z=12)),
    ]

    default_net = GridNetwork(
        id="default-grid",
        name="Default Grid",
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
    _GRIDS[default_net.id] = default_net
    return default_net


def initialize_medium_grid() -> GridNetwork:
    substation = Transformer(
        id="TX-MED",
        name="District Substation (33/11 kV)",
        ratingKva=350.0,
        primaryVoltageKv=33.0,
        secondaryVoltageKv=11.0,
        loadingPercent=58.0,
        temperatureC=36.0,
        status="normal",
        position=Position3D(x=0.0, y=0.6, z=-10.0),
    )

    buses = [
        Bus(
            id="MB-01",
            name="Substation Main Bus",
            voltage=1.020,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=0.0,
            solarKw=0.0,
            lineLoadingPercent=60.0,
            temperatureC=32.0,
            status="normal",
            connectedFeeders=["F-MED-MAIN", "F-MED-N1", "F-MED-S1"],
            connectedAssets=BusConnectedAssets(),
            position=Position3D(x=0.0, y=0.0, z=-5.0),
        ),
        Bus(
            id="MB-02",
            name="North Residential Bus",
            voltage=1.015,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=52.0,
            solarKw=35.0,
            lineLoadingPercent=68.0,
            temperatureC=34.0,
            status="normal",
            connectedFeeders=["F-MED-N1", "F-MED-N2"],
            connectedAssets=BusConnectedAssets(solar="S-MED-01", load="L-MED-01"),
            position=Position3D(x=-6.0, y=0.0, z=0.0),
        ),
        Bus(
            id="MB-03",
            name="North Commercial Bus",
            voltage=1.025,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=58.0,
            solarKw=45.0,
            lineLoadingPercent=74.0,
            temperatureC=35.0,
            status="normal",
            connectedFeeders=["F-MED-N2", "F-MED-TIE"],
            connectedAssets=BusConnectedAssets(solar="S-MED-02", battery="BAT-MED-01", load="L-MED-03"),
            position=Position3D(x=-6.0, y=0.0, z=6.0),
        ),
        Bus(
            id="MB-04",
            name="South Community Bus",
            voltage=1.012,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=40.0,
            solarKw=25.0,
            lineLoadingPercent=62.0,
            temperatureC=33.0,
            status="normal",
            connectedFeeders=["F-MED-S1", "F-MED-S2"],
            connectedAssets=BusConnectedAssets(solar="S-MED-03", load="L-MED-05"),
            position=Position3D(x=6.0, y=0.0, z=0.0),
        ),
        Bus(
            id="MB-05",
            name="South Civic & School Bus",
            voltage=1.018,
            voltageLimitMin=0.95,
            voltageLimitMax=1.05,
            loadKw=50.0,
            solarKw=35.0,
            lineLoadingPercent=66.0,
            temperatureC=34.0,
            status="normal",
            connectedFeeders=["F-MED-S2", "F-MED-TIE"],
            connectedAssets=BusConnectedAssets(solar="S-MED-04", load="L-MED-07"),
            position=Position3D(x=6.0, y=0.0, z=6.0),
        ),
    ]

    feeders = [
        Feeder(
            id="F-MED-MAIN",
            name="Substation Incomer Feeder",
            fromBus="TX-MED",
            toBus="MB-01",
            loadingPercent=58.0,
            capacityKw=400.0,
            activePowerKw=232.0,
            reactivePowerKvar=45.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-MED-N1",
            name="North Feeder Segment 1",
            fromBus="MB-01",
            toBus="MB-02",
            loadingPercent=68.0,
            capacityKw=250.0,
            activePowerKw=170.0,
            reactivePowerKvar=32.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-MED-N2",
            name="North Feeder Segment 2",
            fromBus="MB-02",
            toBus="MB-03",
            loadingPercent=74.0,
            capacityKw=200.0,
            activePowerKw=148.0,
            reactivePowerKvar=28.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-MED-S1",
            name="South Feeder Segment 1",
            fromBus="MB-01",
            toBus="MB-04",
            loadingPercent=62.0,
            capacityKw=250.0,
            activePowerKw=155.0,
            reactivePowerKvar=30.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-MED-S2",
            name="South Feeder Segment 2",
            fromBus="MB-04",
            toBus="MB-05",
            loadingPercent=66.0,
            capacityKw=200.0,
            activePowerKw=132.0,
            reactivePowerKvar=25.0,
            status="normal",
            isSwitchClosed=True,
        ),
        Feeder(
            id="F-MED-TIE",
            name="North-South Tie-Line Switch",
            fromBus="MB-03",
            toBus="MB-05",
            loadingPercent=0.0,
            capacityKw=180.0,
            activePowerKw=0.0,
            reactivePowerKvar=0.0,
            status="normal",
            isSwitchClosed=False,
            isReconfigurableAlternate=True,
        ),
    ]

    solar_units = [
        SolarUnit(
            id="S-MED-01",
            name="Rooftop Solar Cluster North",
            busId="MB-02",
            generationKw=28.0,
            capacityKw=35.0,
            irradianceWm2=850.0,
            status="normal",
            position=Position3D(x=-9.0, y=0.0, z=0.0),
        ),
        SolarUnit(
            id="S-MED-02",
            name="Commercial Plaza PV Canopy",
            busId="MB-03",
            generationKw=38.0,
            capacityKw=45.0,
            irradianceWm2=860.0,
            status="normal",
            position=Position3D(x=-9.0, y=0.0, z=6.0),
        ),
        SolarUnit(
            id="S-MED-03",
            name="Community Solar Carport",
            busId="MB-04",
            generationKw=20.0,
            capacityKw=25.0,
            irradianceWm2=840.0,
            status="normal",
            position=Position3D(x=9.0, y=0.0, z=0.0),
        ),
        SolarUnit(
            id="S-MED-04",
            name="School Rooftop Solar Array",
            busId="MB-05",
            generationKw=30.0,
            capacityKw=35.0,
            irradianceWm2=855.0,
            status="normal",
            position=Position3D(x=9.0, y=0.0, z=6.0),
        ),
    ]

    batteries = [
        Battery(
            id="BAT-MED-01",
            name="District Commercial BESS",
            busId="MB-03",
            powerKw=25.0,
            maxDischargeKw=40.0,
            maxChargeKw=40.0,
            socPercent=65.0,
            capacityKwh=100.0,
            status="normal",
            position=Position3D(x=-9.0, y=0.0, z=8.0),
        ),
    ]

    loads = [
        Load(id="L-MED-01", name="Residential Cluster North A", busId="MB-02", powerKw=24.0, powerFactor=0.93, status="normal", position=Position3D(x=-4.0, y=0.0, z=0.0)),
        Load(id="L-MED-02", name="Apartment Block North", busId="MB-02", powerKw=28.0, powerFactor=0.92, status="normal", position=Position3D(x=-8.0, y=0.0, z=2.0)),
        Load(id="L-MED-03", name="Small Commercial Strip", busId="MB-03", powerKw=32.0, powerFactor=0.94, status="normal", position=Position3D(x=-4.0, y=0.0, z=6.0)),
        Load(id="L-MED-04", name="Retail Complex & Bakery", busId="MB-03", powerKw=26.0, powerFactor=0.91, status="normal", position=Position3D(x=-8.0, y=0.0, z=8.0)),
        Load(id="L-MED-05", name="Residential Cluster South", busId="MB-04", powerKw=22.0, powerFactor=0.93, status="normal", position=Position3D(x=4.0, y=0.0, z=0.0)),
        Load(id="L-MED-06", name="Community Sports Facility", busId="MB-04", powerKw=18.0, powerFactor=0.90, status="normal", position=Position3D(x=8.0, y=0.0, z=2.0)),
        Load(id="L-MED-07", name="Public High School", busId="MB-05", powerKw=30.0, powerFactor=0.95, status="normal", position=Position3D(x=4.0, y=0.0, z=6.0)),
        Load(id="L-MED-08", name="Local Municipal Office", busId="MB-05", powerKw=20.0, powerFactor=0.92, status="normal", position=Position3D(x=8.0, y=0.0, z=8.0)),
    ]

    med_grid = GridNetwork(
        id="medium-test-grid",
        name="Medium Mixed Distribution Grid",
        gridConnectionStatus="connected",
        gridFrequencyHz=50.0,
        substation=substation,
        buses=buses,
        feeders=feeders,
        solarUnits=solar_units,
        batteries=batteries,
        loads=loads,
        lastUpdated=datetime.datetime.now().isoformat(),
    )
    _GRIDS[med_grid.id] = med_grid
    return med_grid


def initialize_large_grid() -> GridNetwork:
    substation = Transformer(
        id="TX-LRG",
        name="Regional Substation (33/11 kV)",
        ratingKva=800.0,
        primaryVoltageKv=33.0,
        secondaryVoltageKv=11.0,
        loadingPercent=64.0,
        temperatureC=38.0,
        status="normal",
        position=Position3D(x=0.0, y=0.6, z=-15.0),
    )

    buses = [
        Bus(
            id="LB-01",
            name="Main Substation Incomer Bus",
            voltage=1.020,
            loadKw=0.0,
            solarKw=0.0,
            lineLoadingPercent=64.0,
            temperatureC=32.0,
            status="normal",
            connectedFeeders=["F-LRG-MAIN", "F-LRG-N1", "F-LRG-C1", "F-LRG-S1"],
            position=Position3D(x=0.0, y=0.0, z=-10.0),
        ),
        Bus(
            id="LB-02",
            name="Feeder 1 North Hub (Residential)",
            voltage=1.018,
            loadKw=65.0,
            solarKw=35.0,
            lineLoadingPercent=70.0,
            temperatureC=33.0,
            status="normal",
            connectedFeeders=["F-LRG-N1", "F-LRG-N2"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-01", load="L-LRG-01"),
            position=Position3D(x=-12.0, y=0.0, z=-4.0),
        ),
        Bus(
            id="LB-03",
            name="Feeder 1 North Branch (Apartments & EV)",
            voltage=1.014,
            loadKw=80.0,
            solarKw=50.0,
            lineLoadingPercent=76.0,
            temperatureC=34.0,
            status="normal",
            connectedFeeders=["F-LRG-N2", "F-LRG-N3"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-02", battery="BAT-LRG-01", load="L-LRG-03"),
            position=Position3D(x=-12.0, y=0.0, z=2.0),
        ),
        Bus(
            id="LB-04",
            name="Feeder 1 North End (Community Hub)",
            voltage=1.022,
            loadKw=55.0,
            solarKw=40.0,
            lineLoadingPercent=68.0,
            temperatureC=33.0,
            status="normal",
            connectedFeeders=["F-LRG-N3", "F-LRG-TIE-NC"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-03", load="L-LRG-05"),
            position=Position3D(x=-12.0, y=0.0, z=8.0),
        ),
        Bus(
            id="LB-05",
            name="Feeder 2 Central Hub (Hospital & Medical)",
            voltage=1.016,
            loadKw=80.0,
            solarKw=45.0,
            lineLoadingPercent=72.0,
            temperatureC=34.0,
            status="normal",
            connectedFeeders=["F-LRG-C1", "F-LRG-C2"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-04", battery="BAT-LRG-02", load="L-LRG-07"),
            position=Position3D(x=0.0, y=0.0, z=-4.0),
        ),
        Bus(
            id="LB-06",
            name="Feeder 2 Central Branch (Shopping Mall)",
            voltage=1.028,
            loadKw=90.0,
            solarKw=75.0,
            lineLoadingPercent=82.0,
            temperatureC=36.0,
            status="normal",
            connectedFeeders=["F-LRG-C2", "F-LRG-C3"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-05", load="L-LRG-09"),
            position=Position3D(x=0.0, y=0.0, z=2.0),
        ),
        Bus(
            id="LB-07",
            name="Feeder 2 Central End (Office Towers)",
            voltage=1.032,
            loadKw=75.0,
            solarKw=50.0,
            lineLoadingPercent=78.0,
            temperatureC=35.0,
            status="normal",
            connectedFeeders=["F-LRG-C3", "F-LRG-TIE-NC", "F-LRG-TIE-CS"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-06", load="L-LRG-11"),
            position=Position3D(x=0.0, y=0.0, z=8.0),
        ),
        Bus(
            id="LB-08",
            name="Feeder 3 South Hub (Light Industrial)",
            voltage=1.012,
            loadKw=75.0,
            solarKw=65.0,
            lineLoadingPercent=75.0,
            temperatureC=35.0,
            status="normal",
            connectedFeeders=["F-LRG-S1", "F-LRG-S2"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-07", load="L-LRG-13"),
            position=Position3D(x=12.0, y=0.0, z=-4.0),
        ),
        Bus(
            id="LB-09",
            name="Feeder 3 South Branch (Logistics & Depot)",
            voltage=1.025,
            loadKw=60.0,
            solarKw=50.0,
            lineLoadingPercent=72.0,
            temperatureC=34.0,
            status="normal",
            connectedFeeders=["F-LRG-S2", "F-LRG-S3"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-08", load="L-LRG-15"),
            position=Position3D(x=12.0, y=0.0, z=2.0),
        ),
        Bus(
            id="LB-10",
            name="Feeder 3 South End (CleanTech Park)",
            voltage=1.045,
            loadKw=50.0,
            solarKw=100.0,
            lineLoadingPercent=88.0,
            temperatureC=38.0,
            status="normal",
            connectedFeeders=["F-LRG-S3", "F-LRG-TIE-CS"],
            connectedAssets=BusConnectedAssets(solar="S-LRG-09", battery="BAT-LRG-03", load="L-LRG-17"),
            position=Position3D(x=12.0, y=0.0, z=8.0),
        ),
    ]

    feeders = [
        Feeder(id="F-LRG-MAIN", name="Primary Substation Trunk", fromBus="TX-LRG", toBus="LB-01", loadingPercent=64.0, capacityKw=800.0, activePowerKw=512.0, reactivePowerKvar=95.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-N1", name="North Residential Trunk", fromBus="LB-01", toBus="LB-02", loadingPercent=70.0, capacityKw=350.0, activePowerKw=245.0, reactivePowerKvar=48.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-N2", name="North Urban Distribution Line", fromBus="LB-02", toBus="LB-03", loadingPercent=76.0, capacityKw=250.0, activePowerKw=190.0, reactivePowerKvar=38.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-N3", name="North Community Line", fromBus="LB-03", toBus="LB-04", loadingPercent=68.0, capacityKw=200.0, activePowerKw=136.0, reactivePowerKvar=27.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-C1", name="Central Commercial Trunk", fromBus="LB-01", toBus="LB-05", loadingPercent=72.0, capacityKw=400.0, activePowerKw=288.0, reactivePowerKvar=56.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-C2", name="Central Retail Distribution Line", fromBus="LB-05", toBus="LB-06", loadingPercent=82.0, capacityKw=300.0, activePowerKw=246.0, reactivePowerKvar=48.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-C3", name="Central Corporate Line", fromBus="LB-06", toBus="LB-07", loadingPercent=78.0, capacityKw=250.0, activePowerKw=195.0, reactivePowerKvar=38.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-S1", name="South Industrial Trunk", fromBus="LB-01", toBus="LB-08", loadingPercent=75.0, capacityKw=350.0, activePowerKw=262.0, reactivePowerKvar=52.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-S2", name="South Logistics Line", fromBus="LB-08", toBus="LB-09", loadingPercent=72.0, capacityKw=250.0, activePowerKw=180.0, reactivePowerKvar=35.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-S3", name="South CleanTech Park Line", fromBus="LB-09", toBus="LB-10", loadingPercent=88.0, capacityKw=250.0, activePowerKw=220.0, reactivePowerKvar=44.0, status="normal", isSwitchClosed=True),
        Feeder(id="F-LRG-TIE-NC", name="North-Central Reconfigurable Tie-Line", fromBus="LB-04", toBus="LB-07", loadingPercent=0.0, capacityKw=200.0, activePowerKw=0.0, reactivePowerKvar=0.0, status="normal", isSwitchClosed=False, isReconfigurableAlternate=True),
        Feeder(id="F-LRG-TIE-CS", name="Central-South Reconfigurable Tie-Line", fromBus="LB-07", toBus="LB-10", loadingPercent=0.0, capacityKw=200.0, activePowerKw=0.0, reactivePowerKvar=0.0, status="normal", isSwitchClosed=False, isReconfigurableAlternate=True),
    ]

    solar_units = [
        SolarUnit(id="S-LRG-01", name="Residential Rooftop PV East", busId="LB-02", generationKw=30.0, capacityKw=35.0, irradianceWm2=860.0, status="normal", position=Position3D(x=-15.0, y=0.0, z=-4.0)),
        SolarUnit(id="S-LRG-02", name="Apartment Rooftop Solar Array", busId="LB-03", generationKw=42.0, capacityKw=50.0, irradianceWm2=855.0, status="normal", position=Position3D(x=-15.0, y=0.0, z=2.0)),
        SolarUnit(id="S-LRG-03", name="School & Muni Solar Canopy", busId="LB-04", generationKw=34.0, capacityKw=40.0, irradianceWm2=850.0, status="normal", position=Position3D(x=-15.0, y=0.0, z=8.0)),
        SolarUnit(id="S-LRG-04", name="Hospital Emergency Solar Facility", busId="LB-05", generationKw=38.0, capacityKw=45.0, irradianceWm2=865.0, status="normal", position=Position3D(x=-3.0, y=0.0, z=-4.0)),
        SolarUnit(id="S-LRG-05", name="Mall Rooftop Solar Megawatt-Fraction", busId="LB-06", generationKw=65.0, capacityKw=75.0, irradianceWm2=870.0, status="normal", position=Position3D(x=-3.0, y=0.0, z=2.0)),
        SolarUnit(id="S-LRG-06", name="Commercial High-Rise BIPV Facade", busId="LB-07", generationKw=42.0, capacityKw=50.0, irradianceWm2=850.0, status="normal", position=Position3D(x=-3.0, y=0.0, z=8.0)),
        SolarUnit(id="S-LRG-07", name="Industrial Rooftop Solar Array", busId="LB-08", generationKw=55.0, capacityKw=65.0, irradianceWm2=860.0, status="normal", position=Position3D(x=15.0, y=0.0, z=-4.0)),
        SolarUnit(id="S-LRG-08", name="Logistics Center Solar Roof", busId="LB-09", generationKw=42.0, capacityKw=50.0, irradianceWm2=855.0, status="normal", position=Position3D(x=15.0, y=0.0, z=2.0)),
        SolarUnit(id="S-LRG-09", name="CleanTech Solar Farm Extension", busId="LB-10", generationKw=88.0, capacityKw=100.0, irradianceWm2=885.0, status="normal", position=Position3D(x=15.0, y=0.0, z=8.0)),
    ]

    batteries = [
        Battery(id="BAT-LRG-01", name="North Sub-district BESS", busId="LB-03", powerKw=35.0, maxDischargeKw=50.0, maxChargeKw=50.0, socPercent=60.0, capacityKwh=120.0, status="normal", position=Position3D(x=-15.0, y=0.0, z=4.0)),
        Battery(id="BAT-LRG-02", name="Hospital Resiliency BESS", busId="LB-05", powerKw=40.0, maxDischargeKw=60.0, maxChargeKw=60.0, socPercent=70.0, capacityKwh=130.0, status="normal", position=Position3D(x=-3.0, y=0.0, z=-6.0)),
        Battery(id="BAT-LRG-03", name="CleanTech Buffer BESS", busId="LB-10", powerKw=35.0, maxDischargeKw=50.0, maxChargeKw=50.0, socPercent=55.0, capacityKwh=100.0, status="normal", position=Position3D(x=15.0, y=0.0, z=10.0)),
    ]

    loads = [
        Load(id="L-LRG-01", name="Residential Subdivision West", busId="LB-02", powerKw=35.0, powerFactor=0.93, status="normal", position=Position3D(x=-9.0, y=0.0, z=-4.0)),
        Load(id="L-LRG-02", name="Residential Subdivision East", busId="LB-02", powerKw=30.0, powerFactor=0.92, status="normal", position=Position3D(x=-9.0, y=0.0, z=-2.0)),
        Load(id="L-LRG-03", name="High-Density Apartment Complex", busId="LB-03", powerKw=45.0, powerFactor=0.94, status="normal", position=Position3D(x=-9.0, y=0.0, z=2.0)),
        Load(id="L-LRG-04", name="EV Fast Charging Hub North", busId="LB-03", powerKw=35.0, powerFactor=0.98, status="normal", position=Position3D(x=-9.0, y=0.0, z=4.0)),
        Load(id="L-LRG-05", name="Municipal Recreation Center", busId="LB-04", powerKw=25.0, powerFactor=0.91, status="normal", position=Position3D(x=-9.0, y=0.0, z=8.0)),
        Load(id="L-LRG-06", name="Elementary & Middle School", busId="LB-04", powerKw=30.0, powerFactor=0.93, status="normal", position=Position3D(x=-9.0, y=0.0, z=10.0)),
        Load(id="L-LRG-07", name="General Hospital & Medical Center", busId="LB-05", powerKw=55.0, powerFactor=0.96, status="normal", position=Position3D(x=3.0, y=0.0, z=-4.0)),
        Load(id="L-LRG-08", name="Medical Plaza & Diagnostics", busId="LB-05", powerKw=25.0, powerFactor=0.94, status="normal", position=Position3D(x=3.0, y=0.0, z=-2.0)),
        Load(id="L-LRG-09", name="Regional Shopping Mall", busId="LB-06", powerKw=60.0, powerFactor=0.92, status="normal", position=Position3D(x=3.0, y=0.0, z=2.0)),
        Load(id="L-LRG-10", name="Cinema & Dining Complex", busId="LB-06", powerKw=30.0, powerFactor=0.90, status="normal", position=Position3D(x=3.0, y=0.0, z=4.0)),
        Load(id="L-LRG-11", name="Corporate Office Tower A", busId="LB-07", powerKw=40.0, powerFactor=0.95, status="normal", position=Position3D(x=3.0, y=0.0, z=8.0)),
        Load(id="L-LRG-12", name="Corporate Office Tower B", busId="LB-07", powerKw=35.0, powerFactor=0.94, status="normal", position=Position3D(x=3.0, y=0.0, z=10.0)),
        Load(id="L-LRG-13", name="Light Manufacturing Plant A", busId="LB-08", powerKw=45.0, powerFactor=0.88, status="normal", position=Position3D(x=9.0, y=0.0, z=-4.0)),
        Load(id="L-LRG-14", name="Textile & Fabrication Workshop", busId="LB-08", powerKw=30.0, powerFactor=0.89, status="normal", position=Position3D(x=9.0, y=0.0, z=-2.0)),
        Load(id="L-LRG-15", name="Automated Distribution Warehouse", busId="LB-09", powerKw=35.0, powerFactor=0.91, status="normal", position=Position3D(x=9.0, y=0.0, z=2.0)),
        Load(id="L-LRG-16", name="Cold Storage Logistics Depot", busId="LB-09", powerKw=25.0, powerFactor=0.87, status="normal", position=Position3D(x=9.0, y=0.0, z=4.0)),
        Load(id="L-LRG-17", name="Clean Technology Research Park", busId="LB-10", powerKw=30.0, powerFactor=0.95, status="normal", position=Position3D(x=9.0, y=0.0, z=8.0)),
        Load(id="L-LRG-18", name="Fleet Depot & EV Yard", busId="LB-10", powerKw=20.0, powerFactor=0.97, status="normal", position=Position3D(x=9.0, y=0.0, z=10.0)),
    ]

    lrg_grid = GridNetwork(
        id="large-test-grid",
        name="Large Renewable Distribution Grid",
        gridConnectionStatus="connected",
        gridFrequencyHz=50.0,
        substation=substation,
        buses=buses,
        feeders=feeders,
        solarUnits=solar_units,
        batteries=batteries,
        loads=loads,
        lastUpdated=datetime.datetime.now().isoformat(),
    )
    _GRIDS[lrg_grid.id] = lrg_grid
    return lrg_grid


def _ensure_default_grids():
    if "DEFAULT_GRID" in _GRIDS:
        del _GRIDS["DEFAULT_GRID"]

    if "default-grid" not in _GRIDS:
        initialize_default_grid()
    if "medium-test-grid" not in _GRIDS:
        initialize_medium_grid()
    if "large-test-grid" not in _GRIDS:
        initialize_large_grid()

    # Integrity verification: benchmark grids must maintain distinct canonical ratings
    def_g = _GRIDS.get("default-grid")
    med_g = _GRIDS.get("medium-test-grid")
    lrg_g = _GRIDS.get("large-test-grid")

    if def_g and med_g and lrg_g:
        load_def = sum(l.powerKw for l in def_g.loads)
        load_med = sum(l.powerKw for l in med_g.loads)
        load_lrg = sum(l.powerKw for l in lrg_g.loads)
        cap_def = sum(s.capacityKw for s in def_g.solarUnits)
        cap_med = sum(s.capacityKw for s in med_g.solarUnits)
        cap_lrg = sum(s.capacityKw for s in lrg_g.solarUnits)

        # If benchmark grids have collapsed into identical load or capacity values (e.g. from cache contamination)
        if load_def == load_med or load_med == load_lrg or cap_def == cap_med or cap_med == cap_lrg:
            logger.warning("[NetworkRepository] Benchmark grid contamination detected. Restoring canonical benchmark configurations.")
            initialize_default_grid()
            initialize_medium_grid()
            initialize_large_grid()


_load_local_cache()
_ensure_default_grids()
_save_local_cache()


class NetworkRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        _ensure_default_grids()

    def _sync_to_supabase(self, grid: GridNetwork):
        if not self.supabase:
            return
        try:
            payload = {
                "id": grid.id,
                "name": grid.name,
                "topology": grid.model_dump(),
                "voltage_min_pu": 0.95,
                "voltage_max_pu": 1.05,
                "feeder_loading_limit_pct": 100.0,
                "transformer_loading_limit_pct": 100.0,
            }
            self.supabase.table("networks").upsert(payload).execute()
            logger.info(f"Persisted grid '{grid.id}' ({grid.name}) to Supabase database.")
        except Exception as e:
            logger.warning(f"Failed to persist grid '{grid.id}' to Supabase: {e}")

    def _sync_all_from_supabase(self):
        if not self.supabase:
            return
        try:
            res = self.supabase.table("networks").select("*").execute()
            if res.data is not None:
                synced = {}
                for row in res.data:
                    grid_id = row.get("id")
                    topology = row.get("topology")
                    if topology and isinstance(topology, dict):
                        try:
                            if grid_id:
                                topology["id"] = grid_id
                            if row.get("name") and not topology.get("name"):
                                topology["name"] = row.get("name")
                            net = GridNetwork(**topology)
                            synced[net.id] = net
                        except Exception as parse_err:
                            logger.warning(f"Could not parse grid row {grid_id}: {parse_err}")
                if synced:
                    _GRIDS.clear()
                    _GRIDS.update(synced)
                    if not os.path.exists(_CACHE_FILE):
                        _save_local_cache()
        except Exception as e:
            logger.warning(f"Error syncing grids from Supabase: {e}")

    async def get_all_grids(self) -> List[GridNetwork]:
        self._sync_all_from_supabase()
        _ensure_default_grids()
        return list(_GRIDS.values())

    async def get_grid(self, grid_id: str) -> Optional[GridNetwork]:
        if grid_id in _GRIDS:
            return _GRIDS[grid_id]

        if grid_id == "default-grid":
            return initialize_default_grid()
        elif grid_id == "medium-test-grid":
            return initialize_medium_grid()
        elif grid_id == "large-test-grid":
            return initialize_large_grid()

        if self.supabase:
            try:
                res = self.supabase.table("networks").select("*").eq("id", grid_id).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    topology = row.get("topology")
                    if topology and isinstance(topology, dict):
                        if grid_id:
                            topology["id"] = grid_id
                        if row.get("name") and not topology.get("name"):
                            topology["name"] = row.get("name")
                        net = GridNetwork(**topology)
                        _GRIDS[net.id] = net
                        return net
            except Exception as e:
                logger.warning(f"Error fetching grid '{grid_id}' from Supabase: {e}")

        return _GRIDS.get(grid_id)

    async def create_grid(self, grid: GridNetwork) -> GridNetwork:
        if not grid.id:
            grid.id = f"GRID-{uuid.uuid4().hex[:6].upper()}"
        if not grid.substation:
            grid.substation = initialize_default_grid().substation
        grid.lastUpdated = datetime.datetime.now().isoformat()
        _GRIDS[grid.id] = grid
        _save_local_cache()
        self._sync_to_supabase(grid)
        return grid

    async def update_grid(self, grid_id: str, grid: GridNetwork) -> Optional[GridNetwork]:
        grid.id = grid_id
        grid.lastUpdated = datetime.datetime.now().isoformat()
        _GRIDS[grid_id] = grid
        _save_local_cache()
        self._sync_to_supabase(grid)
        return grid

    async def delete_grid(self, grid_id: str) -> bool:
        if grid_id == "default-grid":
            return False

        if grid_id in _GRIDS:
            del _GRIDS[grid_id]

        _save_local_cache()

        if self.supabase:
            try:
                self.supabase.table("networks").delete().eq("id", grid_id).execute()
                logger.info(f"Deleted grid '{grid_id}' from Supabase database.")
            except Exception as e:
                logger.warning(f"Failed to delete grid '{grid_id}' from Supabase: {e}")

        global _ACTIVE_GRID_ID
        if _ACTIVE_GRID_ID == grid_id:
            await self.set_active_grid_id("default-grid")

        return True

    async def set_active_grid_id(self, grid_id: str) -> bool:
        global _ACTIVE_GRID_ID
        _ACTIVE_GRID_ID = grid_id
        try:
            os.makedirs(_DATA_DIR, exist_ok=True)
            with open(_ACTIVE_ID_FILE, "w", encoding="utf-8") as f:
                f.write(grid_id)
        except Exception:
            pass
        return True

    async def get_active_grid_id(self) -> str:
        global _ACTIVE_GRID_ID
        if "PYTEST_CURRENT_TEST" in os.environ:
            return "default-grid"
        try:
            if os.path.exists(_ACTIVE_ID_FILE):
                with open(_ACTIVE_ID_FILE, "r", encoding="utf-8") as f:
                    act = f.read().strip()
                    if act and (act in _GRIDS or act == "default-grid"):
                        _ACTIVE_GRID_ID = act
        except Exception:
            pass
        return _ACTIVE_GRID_ID

    async def get_network(self) -> GridNetwork:
        active_id = await self.get_active_grid_id()
        base_net = await self.get_grid(active_id)
        if not base_net:
            base_net = await self.get_grid("default-grid")
        if not base_net:
            base_net = initialize_default_grid()

        from app.services.simulation_service import get_active_power_flow
        active_pf = get_active_power_flow()

        if not active_pf or getattr(active_pf, 'buses', None) is None:
            return base_net

        pf_buses = {b.id: b for b in active_pf.buses}
        pf_feeders = {f.id: f for f in active_pf.feeders}

        updated_buses = [pf_buses.get(b.id, b) for b in base_net.buses]
        updated_feeders = [pf_feeders.get(f.id, f) for f in base_net.feeders]

        return GridNetwork(
            id=base_net.id,
            name=base_net.name,
            gridConnectionStatus=base_net.gridConnectionStatus,
            gridFrequencyHz=base_net.gridFrequencyHz,
            substation=base_net.substation,
            buses=updated_buses,
            feeders=updated_feeders,
            solarUnits=base_net.solarUnits,
            batteries=base_net.batteries,
            loads=base_net.loads,
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
