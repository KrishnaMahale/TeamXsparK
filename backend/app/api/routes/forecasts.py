from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.forecast import ForecastResponse, ForecastMetrics, ForecastRequest
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


def get_forecast_service():
    return ForecastService()


@router.get("/timeseries", response_model=ForecastResponse)
async def get_timeseries_forecast(
    horizon: int = Query(default=24, ge=1, le=48),
    service: ForecastService = Depends(get_forecast_service),
):
    return await service.get_timeseries_forecast(horizon_hours=horizon)


@router.get("/metrics", response_model=ForecastMetrics)
async def get_forecast_metrics(
    service: ForecastService = Depends(get_forecast_service),
):
    return await service.get_forecast_metrics()


@router.get("", response_model=ForecastResponse)
async def get_default_forecast(
    horizon: int = Query(default=24, ge=1, le=48),
    service: ForecastService = Depends(get_forecast_service),
):
    return await service.get_timeseries_forecast(horizon_hours=horizon)


@router.post("", response_model=ForecastResponse)
async def post_forecast(
    request: ForecastRequest,
    service: ForecastService = Depends(get_forecast_service),
):
    return await service.get_timeseries_forecast(horizon_hours=request.horizon_hours)
