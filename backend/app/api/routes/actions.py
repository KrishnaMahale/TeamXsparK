from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.action import CorrectiveAction, ActionExecutionResult
from app.services.action_service import ActionService
from app.schemas.simulation import SimulationInput

router = APIRouter(prefix="/actions", tags=["Actions"])


def get_action_service():
    return ActionService()


@router.get("", response_model=List[CorrectiveAction])
async def list_available_actions(
    grid_id: Optional[str] = Query(None),
    service: ActionService = Depends(get_action_service),
):
    inp = SimulationInput(gridId=grid_id) if grid_id else None
    res = await service.evaluate_actions_for_simulation(inp)
    return res.availableActions


@router.post("/{action_id}/execute", response_model=ActionExecutionResult)
async def execute_action(
    action_id: str,
    grid_id: Optional[str] = Query(None),
    service: ActionService = Depends(get_action_service),
):
    return await service.execute_action(action_id, grid_id=grid_id)
