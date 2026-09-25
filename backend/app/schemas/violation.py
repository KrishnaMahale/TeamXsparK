from enum import Enum
from typing import Optional
from pydantic import BaseModel


class ViolationSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    RESOLVED = "resolved"


class ViolationType(str, Enum):
    OVER_VOLTAGE = "over_voltage"
    UNDER_VOLTAGE = "under_voltage"
    FEEDER_OVERLOAD = "feeder_overload"
    TRANSFORMER_OVERLOAD = "transformer_overload"
    REVERSE_POWER_FLOW = "reverse_power_flow"


class GridViolation(BaseModel):
    id: str
    time: str
    componentType: str  # 'bus' | 'feeder' | 'transformer'
    componentId: str
    componentName: str
    issue: str
    type: ViolationType
    value: float
    unit: str  # 'pu', '%', 'kW'
    formattedValue: str
    limit: float
    formattedLimit: str
    severity: ViolationSeverity
    status: str = "active"  # 'active' | 'resolved'
    recommendationHint: Optional[str] = None


class ViolationSummary(BaseModel):
    total: int
    critical: int
    warning: int
    resolved: int
    hasViolations: bool
