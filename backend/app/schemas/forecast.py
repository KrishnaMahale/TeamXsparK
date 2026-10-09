from typing import List, Optional
from pydantic import BaseModel, Field


class ForecastDataPoint(BaseModel):
    time: str  # "HH:MM", e.g. "13:00"
    timestamp: Optional[str] = None  # Full ISO 8601 with timezone, e.g. "2025-06-10T13:00:00+05:30"
    solarGenerationKw: float
    loadDemandKw: float
    predictedSolarKw: float
    predictedLoadKw: float
    netPowerKw: float  # predictedSolarKw - predictedLoadKw
    confidenceLowerKw: Optional[float] = None
    confidenceUpperKw: Optional[float] = None


class ForecastMetrics(BaseModel):
    currentSolarKw: float
    currentLoadKw: float
    netPowerKw: float
    peakSolarKw: float
    peakLoadKw: float
    solarAccuracyPercent: Optional[float] = None  # Null for future predictions without concurrent actuals
    loadAccuracyPercent: Optional[float] = None   # Null for future predictions without concurrent actuals
    modelType: str = "HistGradientBoosting / Ridge"
    forecastHorizonHours: int = 24
    isMockDemo: bool = False
    gridId: Optional[str] = None
    targetDate: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    resolutionMinutes: int = 15


class ForecastResponse(BaseModel):
    timestamp: str  # Origin timestamp in ISO 8601
    horizonHours: int
    metrics: ForecastMetrics
    dataPoints: List[ForecastDataPoint]


class ForecastRequest(BaseModel):
    forecast_type: str = "both"  # 'solar' | 'load' | 'both'
    horizon_hours: int = Field(default=24, ge=1, le=48)
    grid_id: Optional[str] = None
    target_date: Optional[str] = None
