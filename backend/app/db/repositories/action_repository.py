from typing import Dict, List, Optional
from app.db.supabase import get_supabase_client
from app.schemas.action import CorrectiveAction, ActionExecutionResult
from app.core.logging import logger

_MEMORY_ACTIONS: Dict[str, CorrectiveAction] = {}
_MEMORY_EXEC_RESULTS: Dict[str, ActionExecutionResult] = {}


class ActionRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def save_action(self, action: CorrectiveAction):
        _MEMORY_ACTIONS[action.id] = action

    async def get_action(self, action_id: str) -> Optional[CorrectiveAction]:
        return _MEMORY_ACTIONS.get(action_id)

    async def save_execution_result(self, result: ActionExecutionResult):
        _MEMORY_EXEC_RESULTS[result.actionId] = result

    async def get_execution_result(self, action_id: str) -> Optional[ActionExecutionResult]:
        return _MEMORY_EXEC_RESULTS.get(action_id)
