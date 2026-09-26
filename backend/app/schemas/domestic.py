from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.common import ComponentStatus


class ApplianceItem(BaseModel):
    id: str
    name: str
    powerKw: float
    category: str
    isActive: bool = True
    powerSource: str = "solar"


class RooftopSolarSystem(BaseModel):
    hasSolar: bool
    installedCapacityKw: float
    panelCount: int
    panelType: str
    cellTechnology: str = "Mono PERC Multi-Busbar"
    moduleWattageW: int = 400
    totalSurfaceAreaM2: float = 25.0
    tiltDeg: float = 28.0
    azimuth: str = "180° True South"
    irradianceWm2: float = 960.0
    ambientTempC: float = 31.0
    cellTemperatureC: float = 56.0
    tempCoefficientPmax: float = -0.32
    dcPowerGeneratedKw: float = 0.0
    mpptEfficiencyPercent: float = 99.4
    inverterCapacityKw: float = 5.0
    inverterModel: str = "SolarEdge HD-Wave"
    inverterEfficiencyPercent: float = 98.2
    inverterDcVoltageV: float = 380.0
    inverterDcCurrentA: float = 12.0
    inverterAcPowerKw: float = 0.0
    inverterAcCurrentA: float = 20.0
    gridFrequencyHz: float = 50.02
    operatingPowerFactor: float = 0.99
    reactivePowerKvar: float = 0.0
    voltVarActive: bool = False
    voltWattActive: bool = False
    curtailedKw: float = 0.0
    curtailmentPercent: float = 0.0
    currentGenerationKw: float = 0.0
    dailyYieldKwh: float = 0.0
    monthlyYieldKwh: float = 0.0
    lifetimeMwh: float = 0.0
    avoidedCo2Kg: float = 0.0


class HomeBatterySystem(BaseModel):
    installed: bool
    brand: str
    cellChemistry: str = "LFP (Lithium Iron Phosphate)"
    capacityKwh: float
    usableCapacityKwh: float
    currentSocPercent: float
    maxChargeKw: float
    maxDischargeKw: float
    currentPowerKw: float = 0.0
    mode: Literal["charge", "discharge", "idle"] = "idle"
    roundTripEfficiencyPercent: float = 90.0
    dcBusVoltageV: float = 400.0
    chargeCurrentA: float = 5.0
    temperatureC: float = 28.0
    cycleCount: int = 100
    healthPercent: float = 98.0


class DomesticConsumption(BaseModel):
    currentLoadKw: float
    baseLoadKw: float
    dailyConsumptionKwh: float
    powerFactor: float = 0.97
    solarSelfConsumedKw: float = 0.0
    batterySelfConsumedKw: float = 0.0
    gridImportConsumedKw: float = 0.0
    activeAppliances: List[ApplianceItem] = Field(default_factory=list)
    hasEv: bool = False
    evCharging: bool = False
    evPowerKw: float = 0.0
    evSocPercent: Optional[float] = None


class DomesticTelemetry(BaseModel):
    voltageV: float
    voltagePu: float
    nominalVoltageV: float = 230.0
    phaseVoltageL1: float = 230.0
    phaseVoltageL2: float = 230.0
    phaseVoltageL3: float = 230.0
    voltageUnbalanceFactorPercent: float = 0.0
    currentAmps: float
    netPowerKw: float
    flowDirection: Literal["export", "import", "self_sufficient"]
    powerFactor: float = 0.98
    reactivePowerKvar: float = 0.0
    frequencyHz: float = 50.02
    thdVoltagePercent: float = 1.8
    lineLossesKw: float = 0.0
    status: ComponentStatus = ComponentStatus.NORMAL
    selfConsumptionPercent: float = 0.0
    p2pSharedKw: float = 0.0
    gridExportKw: float = 0.0
    gridImportKw: float = 0.0
    dailyCostSavings: float = 0.0


class Coords(BaseModel):
    x: float
    y: float


class HouseNode(BaseModel):
    id: str
    name: str
    address: str
    houseNumber: int
    distanceMeters: float
    phase: Literal["L1", "L2", "L3"]
    coords: Coords
    rooftopSolar: RooftopSolarSystem
    battery: Optional[HomeBatterySystem] = None
    consumption: DomesticConsumption
    telemetry: DomesticTelemetry


class DomesticTransformer(BaseModel):
    id: str
    name: str
    ratingKva: float = 100.0
    primaryVoltageKv: float = 11.0
    secondaryVoltageV: float = 230.0
    currentLoadKw: float
    currentLoadKva: float
    loadingPercent: float
    flowDirection: Literal["import_from_grid", "reverse_export_to_grid"]
    powerFactor: float = 0.96
    tapPosition: int = 0
    tapRatioPercent: float = 0.0
    phaseLoadingL1Percent: float = 0.0
    phaseLoadingL2Percent: float = 0.0
    phaseLoadingL3Percent: float = 0.0
    voltageUnbalanceFactorPercent: float = 0.0
    status: ComponentStatus = ComponentStatus.NORMAL
    ambientTemperatureC: float = 30.0
    oilTemperatureC: float = 50.0


class StreetSegment(BaseModel):
    id: str
    fromNode: str
    toNode: str
    lengthMeters: float
    cableType: str
    rOhm: float
    xOhm: float
    currentAmps: float
    voltageDropV: float
    loadingPercent: float
    status: ComponentStatus = ComponentStatus.NORMAL


class DomesticGridViolation(BaseModel):
    id: str
    houseId: str
    houseName: str
    type: str
    severity: str
    message: str
    standardRef: str = "IEEE 1547 / EN 50160"
    currentValue: float
    thresholdValue: float
    unit: str
    timestamp: str
    resolvingActionHint: str = ""


class DomesticGridNetwork(BaseModel):
    transformer: DomesticTransformer
    houses: List[HouseNode]
    segments: List[StreetSegment]
    timestamp: str
    totalGenerationKw: float
    totalLoadKw: float
    netGridExchangeKw: float
    peakVoltageV: float
    lowestVoltageV: float
    averageVoltageV: float
    overVoltageHousesCount: int
    underVoltageHousesCount: int
    phaseUnbalanceMaxPercent: float = 0.0
    selfConsumptionRatePercent: float
    totalStorageKwh: float
    averageBatterySocPercent: float
    p2pEnergyExchangedKw: float
    totalLineLossesKw: float = 0.0
    violations: List[DomesticGridViolation] = Field(default_factory=list)


class DomesticSimulateRequest(BaseModel):
    time: str = "12:30"
    preset: Literal["SUNNY_NOON_EXPORT", "EVENING_PEAK", "BALANCED_STORAGE", "OVERCAST_IMPORT"] = "SUNNY_NOON_EXPORT"
    controlAction: Literal[
        "NONE",
        "VOLT_VAR_DROOP",
        "VOLT_WATT_THROTTLE",
        "TRANSFORMER_TAP_CHANGE",
        "BATTERY_PEAK_SHAVING",
        "EV_SMART_CHARGING",
        "PHASE_REBALANCING"
    ] = "NONE"
