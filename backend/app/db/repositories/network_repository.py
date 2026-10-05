import datetime
from typing import Optional, Dict, List
from app.db.supabase import get_supabase_client
from app.schemas.network import (
    GridNetwork, Bus, Feeder, SolarUnit, Battery, Load, Transformer, BusConnectedAssets, Position3D
)
from app.core.logging import logger
import uuid

_GRIDS: Dict[str, GridNetwork] = {}
_ACTIVE_GRID_ID: str = "default-grid"

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

initialize_default_grid()

class NetworkRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        # Ensure default exists
        if not _GRIDS:
            initialize_default_grid()

    async def get_all_grids(self) -> List[GridNetwork]:
        return list(_GRIDS.values())

    async def get_grid(self, grid_id: str) -> Optional[GridNetwork]:
        return _GRIDS.get(grid_id)

    async def create_grid(self, grid: GridNetwork) -> GridNetwork:
        if not grid.id:
            grid.id = f"GRID-{uuid.uuid4().hex[:6].upper()}"
        grid.lastUpdated = datetime.datetime.now().isoformat()
        _GRIDS[grid.id] = grid
        return grid

    async def update_grid(self, grid_id: str, grid: GridNetwork) -> Optional[GridNetwork]:
        if grid_id in _GRIDS:
            grid.id = grid_id
            grid.lastUpdated = datetime.datetime.now().isoformat()
            _GRIDS[grid_id] = grid
            return grid
        return None

    async def delete_grid(self, grid_id: str) -> bool:
        if grid_id == "default-grid":
            return False
        if grid_id in _GRIDS:
            del _GRIDS[grid_id]
            global _ACTIVE_GRID_ID
            if _ACTIVE_GRID_ID == grid_id:
                _ACTIVE_GRID_ID = "default-grid"
            return True
        return False

    async def set_active_grid_id(self, grid_id: str) -> bool:
        global _ACTIVE_GRID_ID
        if grid_id in _GRIDS:
            _ACTIVE_GRID_ID = grid_id
            return True
        return False

    async def get_active_grid_id(self) -> str:
        return _ACTIVE_GRID_ID

    async def get_network(self) -> GridNetwork:
        # Returns the active network, with live power flow data applied if available
        base_net = _GRIDS.get(_ACTIVE_GRID_ID) or _GRIDS.get("default-grid")
        if not base_net:
            base_net = initialize_default_grid()

        from app.services.simulation_service import get_active_power_flow
        active_pf = get_active_power_flow()
        
        # If no active power flow or it's for a different topology run, just return base_net
        if not active_pf or getattr(active_pf, 'buses', None) is None:
            return base_net

        # Apply simulation results dynamically based on component IDs
        pf_buses = {b.id: b for b in active_pf.buses}
        pf_feeders = {f.id: f for f in active_pf.feeders}

        updated_buses = [pf_buses.get(b.id, b) for b in base_net.buses]
        updated_feeders = [pf_feeders.get(f.id, f) for f in base_net.feeders]

        # For solar and load, in a generic solver we would have individual pf results,
        # but since we simplified, let's keep them as is unless we know their values.
        
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
