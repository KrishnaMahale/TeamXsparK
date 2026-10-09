"""Step 4D — Forecast API Endpoints.

Exposes:
- GET /forecast/timeseries (query params: grid_id, target_date, horizon)
- GET /forecast/metrics (query params: grid_id, target_date)
- GET /forecast (legacy fallback to timeseries)
- POST /forecast (body: ForecastRequest)
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.schemas.forecast import ForecastResponse, ForecastMetrics, ForecastRequest
from app.services.forecast_service import ForecastService
from app.ml.model_registry import ModelArtifactNotFoundError
from app.core.logging import logger

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


def get_forecast_service() -> ForecastService:
    return ForecastService()


@router.get("/timeseries", response_model=ForecastResponse)
async def get_timeseries_forecast(
    grid_id: Optional[str] = Query(default=None, description="Target grid network ID"),
    target_date: Optional[str] = Query(default=None, description="Target date YYYY-MM-DD in Asia/Kolkata"),
    horizon: int = Query(default=24, description="Forecast horizon in hours (must be 24)"),
    service: ForecastService = Depends(get_forecast_service),
):
    try:
        return await service.get_timeseries_forecast(
            grid_id=grid_id,
            target_date=target_date,
            horizon_hours=horizon,
        )
    except ValueError as e:
        logger.warning(f"[ForecastAPI] Validation error: {e}")
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except ModelArtifactNotFoundError as e:
        logger.error(f"[ForecastAPI] Model artifact error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Forecast model unavailable: {e}",
        )
    except Exception as e:
        logger.error(f"[ForecastAPI] Unexpected forecast error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast generation failed: {e}",
        )


@router.get("/metrics", response_model=ForecastMetrics)
async def get_forecast_metrics(
    grid_id: Optional[str] = Query(default=None, description="Target grid network ID"),
    target_date: Optional[str] = Query(default=None, description="Target date YYYY-MM-DD in Asia/Kolkata"),
    service: ForecastService = Depends(get_forecast_service),
):
    try:
        return await service.get_forecast_metrics(grid_id=grid_id, target_date=target_date)
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except ModelArtifactNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("", response_model=ForecastResponse)
async def get_default_forecast(
    grid_id: Optional[str] = Query(default=None),
    target_date: Optional[str] = Query(default=None),
    horizon: int = Query(default=24),
    service: ForecastService = Depends(get_forecast_service),
):
    return await get_timeseries_forecast(
        grid_id=grid_id,
        target_date=target_date,
        horizon=horizon,
        service=service,
    )


@router.post("", response_model=ForecastResponse)
async def post_forecast(
    request: ForecastRequest,
    service: ForecastService = Depends(get_forecast_service),
):
    return await get_timeseries_forecast(
        grid_id=request.grid_id,
        target_date=request.target_date,
        horizon=request.horizon_hours,
        service=service,
    )
