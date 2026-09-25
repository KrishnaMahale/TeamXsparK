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
