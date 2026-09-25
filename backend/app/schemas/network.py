from typing import List, Optional, Union
from pydantic import BaseModel, Field
from app.schemas.common import ComponentStatus, ComponentType


class BusConnectedAssets(BaseModel):
    solar: Optional[str] = None
    battery: Optional[str] = None
    load: Optional[str] = None


class Bus(BaseModel):
    id: str
    name: str
    voltage: float
    voltageLimitMin: float = 0.95
    voltageLimitMax: float = 1.05
    loadKw: float = 0.0
    solarKw: float = 0.0
    lineLoadingPercent: float = 0.0
    temperatureC: float = 30.0
    status: ComponentStatus = ComponentStatus.NORMAL
    connectedFeeders: List[str] = Field(default_factory=list)
    connectedAssets: BusConnectedAssets = Field(default_factory=BusConnectedAssets)


class Feeder(BaseModel):
    id: str
    name: str
    fromBus: str
    toBus: str
    loadingPercent: float
    loadingLimitPercent: float = 100.0
    capacityKw: float
    activePowerKw: float = 0.0
    reactivePowerKvar: float = 0.0
    status: ComponentStatus = ComponentStatus.NORMAL
    isSwitchClosed: bool = True
    isReconfigurableAlternate: Optional[bool] = False


class SolarUnit(BaseModel):
    id: str
    name: str
    busId: str
    generationKw: float
    capacityKw: float
    irradianceWm2: float = 800.0
    curtailedKw: float = 0.0
    status: ComponentStatus = ComponentStatus.NORMAL


class Battery(BaseModel):
    id: str
    name: str
    busId: str
    powerKw: float = 0.0  # positive = discharging, negative = charging
    maxDischargeKw: float = 40.0
    maxChargeKw: float = 40.0
    socPercent: float = 60.0
    capacityKwh: float = 100.0
    status: ComponentStatus = ComponentStatus.NORMAL
    cycleCount: int = 100


class Load(BaseModel):
    id: str
    name: str
    busId: str
    powerKw: float
    powerFactor: float = 0.95
    status: ComponentStatus = ComponentStatus.NORMAL


class Transformer(BaseModel):
    id: str
    name: str
    ratingKva: float
    primaryVoltageKv: float = 33.0
    secondaryVoltageKv: float = 11.0
    loadingPercent: float = 50.0
    temperatureC: float = 35.0
    status: ComponentStatus = ComponentStatus.NORMAL


class GridNetwork(BaseModel):
    gridConnectionStatus: str = "connected"
    gridFrequencyHz: float = 50.0
    substation: Transformer
    buses: List[Bus]
    feeders: List[Feeder]
    solarUnits: List[SolarUnit]
    batteries: List[Battery]
    loads: List[Load]
    lastUpdated: str
