from app.ml.model_manager import get_model_manager
from app.schemas.forecast import ForecastResponse, ForecastMetrics


class ForecastService:
    def __init__(self):
        self.manager = get_model_manager()

    async def get_timeseries_forecast(self, horizon_hours: int = 24) -> ForecastResponse:
        return self.manager.generate_24h_forecast(horizon_hours=horizon_hours)

    async def get_forecast_metrics(self) -> ForecastMetrics:
        fc = self.manager.generate_24h_forecast(24)
        return fc.metrics
