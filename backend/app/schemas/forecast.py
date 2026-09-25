from typing import List, Optional
from pydantic import BaseModel, Field


class ForecastDataPoint(BaseModel):
    time: str  # "HH:MM", e.g. "13:00"
    solarGenerationKw: float
    loadDemandKw: float
    predictedSolarKw: float
    predictedLoadKw: float
    netPowerKw: float
    confidenceLowerKw: Optional[float] = None
    confidenceUpperKw: Optional[float] = None


class ForecastMetrics(BaseModel):
    currentSolarKw: float
    currentLoadKw: float
    netPowerKw: float
    peakSolarKw: float
    peakLoadKw: float
    solarAccuracyPercent: float
    loadAccuracyPercent: float
    modelType: str = "Random Forest Regressor"
    forecastHorizonHours: int = 24
    isMockDemo: bool = False


class ForecastResponse(BaseModel):
    timestamp: str
    horizonHours: int
    metrics: ForecastMetrics
    dataPoints: List[ForecastDataPoint]


class ForecastRequest(BaseModel):
    forecast_type: str = "both"  # 'solar' | 'load' | 'both'
    horizon_hours: int = Field(default=24, ge=1, le=48)
