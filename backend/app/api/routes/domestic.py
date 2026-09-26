from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas.domestic import (
    DomesticGridNetwork,
    DomesticSimulateRequest,
    HouseNode,
)
from app.engine.domestic_engine import DomesticDistFlowEngine

router = APIRouter(prefix="/domestic", tags=["Domestic Rooftop Grid"])

engine = DomesticDistFlowEngine()


@router.get("/network", response_model=DomesticGridNetwork)
async def get_domestic_network(
    time: str = Query("12:30", description="Time of day HH:MM"),
    preset: str = Query("SUNNY_NOON_EXPORT", description="Preset name"),
    action: str = Query("NONE", description="Mitigation action"),
):
    """
    Get current residential rooftop solar low-voltage distribution network state.
    """
    return engine.solve(time_str=time, preset=preset, control_action=action)


@router.post("/simulate", response_model=DomesticGridNetwork)
async def simulate_domestic_grid(request: DomesticSimulateRequest):
    """
    Simulate domestic rooftop solar power flow under custom time, preset, and control actions.
    """
    return engine.solve(
        time_str=request.time,
        preset=request.preset,
        control_action=request.controlAction,
    )


@router.get("/houses/{house_id}", response_model=Optional[HouseNode])
async def get_house_telemetry(
    house_id: str,
    time: str = Query("12:30"),
):
    """
    Get detailed telemetry for a specific residential rooftop solar house.
    """
    net = engine.solve(time_str=time)
    for h in net.houses:
        if h.id == house_id:
            return h
    return None
