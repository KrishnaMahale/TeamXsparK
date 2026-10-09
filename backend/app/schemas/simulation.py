from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.network import Bus, Feeder
from app.schemas.violation import GridViolation
from app.schemas.action import CorrectiveAction, ActionExecutionResult
from app.schemas.battery import BatteryStorageConfig


class TimeSeriesSolarPoint(BaseModel):
    id: str
    time: str  # "HH:MM"
    solarKw: float = Field(..., ge=0.0)


class TimeSeriesLoadPoint(BaseModel):
    id: str
    time: str  # "HH:MM"
    loadKw: float = Field(..., ge=0.0)


class NetworkLimitsConfig(BaseModel):
    voltageMinPu: float = Field(default=0.95, gt=0.0)
    voltageMaxPu: float = Field(default=1.05, gt=0.0)
    feederLoadingLimitPercent: float = Field(default=100.0, gt=0.0)
    transformerLoadingLimitPercent: float = Field(default=100.0, gt=0.0)
    feederTopology: str = "normal"  # 'normal' | 'alternative'


import math

def generate_default_solar_points() -> List[TimeSeriesSolarPoint]:
    times = [
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"
    ]
    pts = []
    for idx, t in enumerate(times):
        hour = 6 + idx
        factor = 0.0
        if 6 <= hour <= 19:
            factor = math.sin(((hour - 6) / 13.0) * math.pi)
        pts.append(TimeSeriesSolarPoint(id=f"solar-{t}", time=t, solarKw=round(250.0 * max(0.0, factor), 1)))
    return pts


def generate_default_load_points() -> List[TimeSeriesLoadPoint]:
    times = [
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"
    ]
    weights = {
        "06:00": 0.35, "07:00": 0.42, "08:00": 0.52, "09:00": 0.60,
        "10:00": 0.65, "11:00": 0.70, "12:00": 0.73, "13:00": 0.75,
        "14:00": 0.78, "15:00": 0.82, "16:00": 0.85, "17:00": 0.90,
        "18:00": 1.00, "19:00": 0.96, "20:00": 0.88, "21:00": 0.78,
        "22:00": 0.65, "23:00": 0.50, "24:00": 0.42,
    }
    return [
        TimeSeriesLoadPoint(id=f"load-{t}", time=t, loadKw=round(180.0 * weights.get(t, 0.5), 1))
        for t in times
    ]


class SimulationInput(BaseModel):
    gridId: Optional[str] = None
    scenarioName: str = "High Solar + Low Load"
    scenarioDescription: Optional[str] = ""
    simulationDate: Optional[str] = "2026-09-25"
    simulationDuration: str = "24 hours"
    timeResolution: str = "1 hour"
    simulationSource: Optional[str] = "scenario"
    installedSolarCapacityKw: float = Field(default=250.0, ge=0.0)
    currentSolarKw: float = Field(default=240.0, ge=0.0)
    solarTimeSeries: List[TimeSeriesSolarPoint] = Field(default_factory=generate_default_solar_points)
    peakLoadKw: float = Field(default=180.0, ge=0.0)
    currentLoadKw: float = Field(default=120.0, ge=0.0)
    loadTimeSeries: List[TimeSeriesLoadPoint] = Field(default_factory=generate_default_load_points)
    networkConfig: NetworkLimitsConfig = Field(default_factory=NetworkLimitsConfig)
    batteryConfig: BatteryStorageConfig = Field(default_factory=BatteryStorageConfig)


class BeforeAfterComparisonPoint(BaseModel):
    before: float
    after: float
    limit: Optional[float] = None
    status: Optional[str] = "safe"


class BeforeAfterSolarUsed(BaseModel):
    before: float
    after: float
    capacity: float


class BeforeAfterBatterySoc(BaseModel):
    before: float
    after: float


class BeforeAfterComparisonData(BaseModel):
    b3Voltage: BeforeAfterComparisonPoint
    f02Loading: BeforeAfterComparisonPoint
    solarUsed: BeforeAfterSolarUsed
    batterySoc: BeforeAfterBatterySoc
    isSafe: bool = True
    renewableUseMaintainedPercent: float = 96.0
    selectedActionTitle: str = "Feeder Reconfiguration (F-02 → F-03)"
    monitoredBusId: Optional[str] = "B3"
    monitoredBusName: Optional[str] = "Bus 3"
    monitoredFeederId: Optional[str] = "F-02"
    monitoredFeederName: Optional[str] = "Feeder F-02"
    beforeViolationsCount: Optional[int] = 2
    afterViolationsCount: Optional[int] = 0
    gridId: Optional[str] = None
    gridName: Optional[str] = None


class PowerFlowResult(BaseModel):
    timestamp: str
    converged: bool = True
    iterations: int = 4
    buses: List[Bus]
    feeders: List[Feeder]
    violations: List[GridViolation]
    totalLossKw: float = 0.0
    totalGenerationKw: float = 0.0
    totalDemandKw: float = 0.0
    batterySocPercent: Optional[float] = 62.0


class SimulationSummaryInfo(BaseModel):
    scenarioName: str
    simulationTime: str
    solarKw: float
    loadKw: float
    netPowerKw: float
    status: str  # 'safe' | 'warning' | 'violations_detected' | 'infeasible'
    initialViolations: int
    resolvedViolations: int
    recommendedAction: str
    isActionFeasible: bool


class FullSimulationResult(BaseModel):
    scenarioId: Optional[str] = None
    input: SimulationInput
    timeStepResults: Dict[str, PowerFlowResult]
    availableActions: List[CorrectiveAction]
    recommendedActionId: str
    comparisonData: BeforeAfterComparisonData
    summary: SimulationSummaryInfo
    hybridPlan: Optional[CorrectiveAction] = None


class SimulationResponse(BaseModel):
    powerFlow: PowerFlowResult
    availableActions: List[CorrectiveAction]
    recommendedActionId: str
    comparisonData: BeforeAfterComparisonData
    executionResult: Optional[ActionExecutionResult] = None
    hybridPlan: Optional[CorrectiveAction] = None


class SingleTimePowerFlowRequest(BaseModel):
    time: str = "13:15"
    scenarioId: Optional[str] = None
    gridId: Optional[str] = None


class SimulationCreateRequest(BaseModel):
    scenario_id: Optional[str] = None
    input: Optional[SimulationInput] = None


class SimulationCreateResponse(BaseModel):
    simulation_id: str
    status: str


class CorrectiveActionsEvaluationRequest(BaseModel):
    violationIds: Optional[List[str]] = None
    input: Optional[SimulationInput] = None
    gridId: Optional[str] = None

