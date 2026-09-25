from typing import List
from fastapi import APIRouter, Depends
from app.schemas.action import CorrectiveAction, ActionExecutionResult
from app.services.action_service import ActionService

router = APIRouter(prefix="/actions", tags=["Actions"])


def get_action_service():
    return ActionService()


@router.get("", response_model=List[CorrectiveAction])
async def list_available_actions(service: ActionService = Depends(get_action_service)):
    res = await service.evaluate_actions_for_simulation()
    return res.availableActions


@router.post("/{action_id}/execute", response_model=ActionExecutionResult)
async def execute_action(
    action_id: str,
    service: ActionService = Depends(get_action_service),
):
    return await service.execute_action(action_id)
