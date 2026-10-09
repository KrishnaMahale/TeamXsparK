from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class CorrectiveAction(BaseModel):
    id: str
    type: str  # 'battery_discharge' | 'feeder_reconfiguration' | 'solar_curtailment' | 'max_battery_discharge'
    title: str
    description: str
    parameterDelta: str  # e.g. "-40 kW", "Switch F-02 → F-03", "-30 kW"
    durationMinutes: Optional[int] = 30
    isFeasible: bool
    infeasibleReason: Optional[str] = None
    expectedVoltagePu: float
    expectedFeederLoadPercent: float
    solarUsedKw: float
    batterySocPercent: float
    resolvedViolationsCount: int = 0
    remainingViolationsCount: int = 0
    renewableUtilizationPercent: float = 100.0
    targetComponentId: Optional[str] = None
    targetComponentName: Optional[str] = None
    gridId: Optional[str] = None
    dispatchKw: Optional[float] = None
    curtailmentKw: Optional[float] = None
    targetTopology: Optional[str] = None
    controlDirection: Optional[str] = None
    isHybrid: bool = False
    constituentActions: Optional[list] = Field(default_factory=list)
    fullHorizonSafe: Optional[bool] = None
    horizonViolationsCount: Optional[int] = None
    selectionReason: Optional[str] = None


class HybridActionPlan(CorrectiveAction):
    type: str = "hybrid_plan"
    isHybrid: bool = True


class ActionComparisonRow(BaseModel):
    actionId: str
    actionTitle: str
    voltage: str
    feederLoading: str
    solarUsed: str
    batterySoc: str
    violationsRemaining: int
    isFeasible: bool
    infeasibleNote: Optional[str] = None


class ActionStateSnapshot(BaseModel):
    b3Voltage: float
    f02LoadingPercent: float
    solarUsedKw: float
    batterySocPercent: float
    violationsCount: int
    monitoredBusId: Optional[str] = "B3"
    monitoredBusName: Optional[str] = "Bus 3"
    monitoredFeederId: Optional[str] = "F-02"
    monitoredFeederName: Optional[str] = "Feeder F-02"
    gridId: Optional[str] = None
    gridName: Optional[str] = None


class ActionAfterStateSnapshot(ActionStateSnapshot):
    renewableUseMaintainedPercent: float = 100.0
    isSafe: bool = True


class ActionExecutionResult(BaseModel):
    actionId: str
    executedAt: str
    success: bool
    message: str
    beforeState: ActionStateSnapshot
    afterState: ActionAfterStateSnapshot


class ActionCandidateRequest(BaseModel):
    action_type: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
