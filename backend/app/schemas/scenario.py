from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GridScenario(BaseModel):
    id: str
    name: str
    description: str
    solarKw: float
    loadKw: float
    batterySocPercent: float
    expectedCondition: str
    status: str  # 'optimal' | 'warning' | 'critical' | 'infeasible'
    violationsExpected: int
    recommendedActionHint: str
    simulatedTime: str = "13:15"


class ScenarioExecutionResponse(BaseModel):
    scenario: GridScenario
    executedAt: str
    initialViolations: int
    resolvedViolations: int
    recommendedAction: str
    isFeasible: bool


class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    scenario_type: str = "CUSTOM"
    start_time: Optional[str] = "06:00"
    end_time: Optional[str] = "24:00"
    resolution: int = 60
    solar_capacity_kw: float = 250.0
    solar_profile: List[Dict[str, Any]] = Field(default_factory=list)
    load_profile: List[Dict[str, Any]] = Field(default_factory=list)
    network_config: Dict[str, Any] = Field(default_factory=dict)
    battery_config: Dict[str, Any] = Field(default_factory=dict)


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    scenario_type: Optional[str] = None
    solar_capacity_kw: Optional[float] = None
    network_config: Optional[Dict[str, Any]] = None
    battery_config: Optional[Dict[str, Any]] = None
