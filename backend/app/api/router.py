from fastapi import APIRouter
from app.api.routes import (
    health,
    scenarios,
    simulations,
    forecasts,
    network,
    actions,
    reports,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(scenarios.router)
api_router.include_router(simulations.router)
api_router.include_router(forecasts.router)
api_router.include_router(network.router)
api_router.include_router(actions.router)
api_router.include_router(reports.router)
