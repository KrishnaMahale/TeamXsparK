"""
Sequential Multi-Step Controller Schemas for Renewable Distribution Grid Digital Twin.
Defines data structures for receding-horizon trajectory optimization, physical verification,
and timestep state propagation across H >= 8 intervals (15-minute resolution).
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ControllerActionType(str, Enum):
    IDLE = "idle"
    BATTERY_DISPATCH = "battery_dispatch"
    FEEDER_RECONFIGURATION = "feeder_reconfiguration"
    SOLAR_CURTAILMENT = "solar_curtailment"
    HYBRID_PLAN = "hybrid_plan"


class PlanStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    ERROR = "ERROR"


class SequentialForecastPoint(BaseModel):
    time: str = Field(..., description="Timestamp in HH:MM format e.g. 12:00")
    solarKw: float = Field(default=0.0, ge=0.0, description="Forecasted or observed PV generation in kW")
    loadKw: float = Field(default=0.0, ge=0.0, description="Forecasted or observed consumer load demand in kW")
    timestamp: Optional[str] = Field(default=None, description="Optional ISO timestamp")


class SequentialControlRequest(BaseModel):
    gridId: str = Field(..., description="Target distribution grid network ID")
    startTimestep: str = Field(default="12:00", description="Start timestep in HH:MM format")
    horizonSteps: int = Field(default=8, ge=8, le=96, description="Lookahead planning horizon steps (min 8 steps, default 8 = 2.0h)")
    stepDurationHours: float = Field(default=0.25, gt=0.0, le=1.0, description="Timestep duration in hours (default 0.25 = 15m)")
    initialSocPercent: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Initial lumped battery SOC percent")
    batterySocs: Optional[Dict[str, float]] = Field(default=None, description="Initial per-battery SOC percentage mapping {batteryId: soc%}")
    initialTopology: Optional[str] = Field(default="standard", description="Initial grid topology: 'standard' or 'alternative'")
    forecastData: Optional[List[SequentialForecastPoint]] = Field(default=None, description="Chronological 15-minute forecast series")
    recedingHorizonMode: bool = Field(default=True, description="True to recommend first action for immediate deployment; False for open-loop trajectory")
    allowSurrogateScreening: bool = Field(default=False, description="Optional surrogate pre-filtering heuristic for large candidate sets")


class PlannedStepAction(BaseModel):
    stepIndex: int = Field(..., description="Chronological index 0 to H-1 within planning horizon")
    time: str = Field(..., description="Timestamp HH:MM")
    actionType: ControllerActionType = Field(..., description="Operating control classification")
    title: str = Field(..., description="Human-readable action description")
    batteryPowerKw: float = Field(default=0.0, description="Signed dispatch: positive = discharge / injection; negative = charge / absorption")
    curtailmentKw: float = Field(default=0.0, ge=0.0, description="Active PV power curtailed in kW")
    targetTopology: str = Field(default="standard", description="Grid topology state: 'standard' or 'alternative'")
    batterySocBefore: float = Field(..., description="Battery SOC percentage prior to timestep execution")
    batterySocAfter: float = Field(..., description="Battery SOC percentage following timestep dispatch")
    batterySocsAfter: Dict[str, float] = Field(default_factory=dict, description="Per-battery SOC percentages following dispatch")
    expectedVoltagePu: float = Field(..., description="Critical bus voltage magnitude in pu after action physics")
    expectedFeederLoadPercent: float = Field(..., description="Critical feeder loading percentage after action physics")
    expectedTxLoadingPercent: float = Field(..., description="Substation transformer loading percentage after action physics")
    totalLossKw: float = Field(default=0.0, description="Total technical distribution losses in kW")
    violationsCount: int = Field(default=0, description="Number of remaining constraint violations after action physics")
    isPhysicallyVerified: bool = Field(default=True, description="Authoritatively verified with physical PowerFlowEngine.solve()")
    solverConverged: bool = Field(default=True, description="Physical solver convergence indicator")
    stepCost: float = Field(default=0.0, description="Evaluated objective cost for this planned step")


class SequentialControlResponse(BaseModel):
    gridId: str = Field(..., description="Target grid network ID")
    startTimestep: str = Field(..., description="Planning horizon start time")
    horizonSteps: int = Field(..., description="Total lookahead steps evaluated")
    durationHours: float = Field(..., description="Lookahead horizon in hours (e.g. 2.0h)")
    status: PlanStatus = Field(..., description="Overall feasibility status: FEASIBLE or INFEASIBLE")
    isFeasible: bool = Field(..., description="True if a 100% violation-free trajectory was verified")
    fallbackReason: Optional[str] = Field(default=None, description="Diagnostic details if plan is infeasible or fallback occurred")
    recommendedFirstAction: Optional[PlannedStepAction] = Field(default=None, description="First action to deploy in receding-horizon control")
    plannedTrajectory: List[PlannedStepAction] = Field(default_factory=list, description="Verified chronological multi-step trajectory")
    initialViolationsTotal: int = Field(default=0, description="Total cumulative violations across horizon in unmitigated baseline")
    remainingViolationsTotal: int = Field(default=0, description="Total cumulative violations across horizon under planned controls")
    totalSolarCurtailmentKwh: float = Field(default=0.0, description="Total solar energy curtailed across horizon in kWh")
    totalLossKwh: float = Field(default=0.0, description="Total distribution line losses across horizon in kWh")
    switchingOperationsCount: int = Field(default=0, description="Number of topology changeover operations commanded")
    terminalSocPercent: float = Field(..., description="Predicted battery SOC at the end of the planning horizon")
    physicalSolveCount: int = Field(default=0, description="Authoritative PowerFlowEngine.solve() calls executed during planning")
    planningLatencyMs: float = Field(default=0.0, description="Total execution wall-clock time in milliseconds")
    surrogateEvaluationCount: int = Field(default=0, description="Total candidate action transitions screened via surrogate")
    surrogateFallbackCount: int = Field(default=0, description="Candidate transitions requiring physical solver fallback")
    surrogatePrunedCount: int = Field(default=0, description="Candidate transitions safely pruned without physical power flow solve")
