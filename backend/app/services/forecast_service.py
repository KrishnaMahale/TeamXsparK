"""Step 4D — Forecast Service connecting NetworkRepository and ForecastPipeline."""

from typing import Optional
from app.core.logging import logger
from app.db.repositories.network_repository import NetworkRepository
from app.ml.forecast_pipeline import get_forecast_pipeline
from app.schemas.forecast import ForecastResponse, ForecastMetrics


class ForecastService:
    def __init__(self):
        self.pipeline = get_forecast_pipeline()
        self.network_repo = NetworkRepository()

    async def get_timeseries_forecast(
        self,
        grid_id: Optional[str] = None,
        target_date: Optional[str] = None,
        horizon_hours: int = 24,
    ) -> ForecastResponse:
        """Generates real 15-minute 24-hour day-ahead forecast for the specified or active grid."""
        # 1. Resolve grid
        if grid_id:
            grid = await self.network_repo.get_grid(grid_id)
            if not grid:
                raise ValueError(f"Grid with id '{grid_id}' not found.")
        else:
            grid = await self.network_repo.get_network()
            if not grid:
                raise ValueError("Active grid not found.")

        # 2. Execute forecast pipeline
        return self.pipeline.generate_forecast(
            grid=grid,
            target_date_str=target_date,
            horizon_hours=horizon_hours,
        )

    async def get_forecast_metrics(
        self,
        grid_id: Optional[str] = None,
        target_date: Optional[str] = None,
    ) -> ForecastMetrics:
        """Returns forecast summary metrics for specified or active grid."""
        fc = await self.get_timeseries_forecast(grid_id=grid_id, target_date=target_date, horizon_hours=24)
        return fc.metrics
