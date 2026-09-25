from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class GridReportSummary(BaseModel):
    scenarioName: str
    simulationTime: str
    initialViolations: int
    finalViolations: int
    renewableUtilizationPercent: float
    recommendedAction: str
    peakSolarKw: float
    peakLoadKw: float
    curtailedEnergyKwh: float = 0.0
    batteryThroughputKwh: float = 0.0
    gridLossPercent: float = 3.2
    voltageStabilityIndex: float = 0.98
    generatedAt: str


class ReportExportData(BaseModel):
    reportId: str
    timestamp: str
    summary: GridReportSummary
    buses: List[Dict[str, Any]]
    feeders: List[Dict[str, Any]]
    violations: List[Dict[str, Any]]


class ReportGenerateRequest(BaseModel):
    scenarioName: str = "High Solar"
    simulationTime: str = "13:15"
