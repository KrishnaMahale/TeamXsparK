import datetime
from typing import Dict, List, Optional
from app.db.repositories.action_repository import ActionRepository
from app.schemas.action import (
    CorrectiveAction,
    ActionExecutionResult,
    ActionStateSnapshot,
    ActionAfterStateSnapshot,
)
from app.schemas.simulation import (
    SimulationResponse,
    PowerFlowResult,
    SimulationInput,
)
from app.engine.actions import ActionEngine
from app.engine.network_engine import NetworkEngine
from app.core.exceptions import ResourceNotFoundException


class ActionService:
    def __init__(self):
        self.repository = ActionRepository()

    async def evaluate_actions_for_simulation(
        self,
        simulation_input: Optional[SimulationInput] = None
    ) -> SimulationResponse:
        input_data = simulation_input or SimulationInput()
        full_res = NetworkEngine.run_full_simulation(input_data)
        peak_key = "13:15" if "13:15" in full_res.timeStepResults else list(full_res.timeStepResults.keys())[0]
        peak_flow = full_res.timeStepResults[peak_key]

        return SimulationResponse(
            powerFlow=peak_flow,
            availableActions=full_res.availableActions,
            recommendedActionId=full_res.recommendedActionId,
            comparisonData=full_res.comparisonData,
        )

    async def execute_action(self, action_id: str) -> ActionExecutionResult:
        now_str = datetime.datetime.now().isoformat()

        # Action parameters mapping based on action_id
        if action_id == "ACT-01": # Battery Discharge
            result = ActionExecutionResult(
                actionId="ACT-01",
                executedAt=now_str,
                success=True,
                message="Battery discharged 40 kW into Bus 3. Local voltage rise mitigated to 1.045 pu.",
                beforeState=ActionStateSnapshot(
                    b3Voltage=1.074,
                    f02LoadingPercent=108.0,
                    solarUsedKw=240.0,
                    batterySocPercent=62.0,
                    violationsCount=2,
                ),
                afterState=ActionAfterStateSnapshot(
                    b3Voltage=1.045,
                    f02LoadingPercent=98.0,
                    solarUsedKw=240.0,
                    batterySocPercent=48.0,
                    violationsCount=0,
                    renewableUseMaintainedPercent=100.0,
                    isSafe=True,
                ),
            )
        elif action_id == "ACT-02": # Feeder Reconfiguration
            result = ActionExecutionResult(
                actionId="ACT-02",
                executedAt=now_str,
                success=True,
                message="Feeder switch executed: F-02 open, tie-line F-03 closed. Line loading reduced to 92%.",
                beforeState=ActionStateSnapshot(
                    b3Voltage=1.074,
                    f02LoadingPercent=108.0,
                    solarUsedKw=240.0,
                    batterySocPercent=62.0,
                    violationsCount=2,
                ),
                afterState=ActionAfterStateSnapshot(
                    b3Voltage=1.038,
                    f02LoadingPercent=92.0,
                    solarUsedKw=240.0,
                    batterySocPercent=62.0,
                    violationsCount=0,
                    renewableUseMaintainedPercent=100.0,
                    isSafe=True,
                ),
            )
        elif action_id == "ACT-03": # Solar Curtailment
            result = ActionExecutionResult(
                actionId="ACT-03",
                executedAt=now_str,
                success=True,
                message="Rooftop solar curtailed by 30 kW at Bus 3. Over-voltage condition eliminated.",
                beforeState=ActionStateSnapshot(
                    b3Voltage=1.074,
                    f02LoadingPercent=108.0,
                    solarUsedKw=240.0,
                    batterySocPercent=62.0,
                    violationsCount=2,
                ),
                afterState=ActionAfterStateSnapshot(
                    b3Voltage=1.032,
                    f02LoadingPercent=90.0,
                    solarUsedKw=210.0,
                    batterySocPercent=62.0,
                    violationsCount=0,
                    renewableUseMaintainedPercent=87.5,
                    isSafe=True,
                ),
            )
        elif action_id == "ACT-04": # Max Battery Discharge (Infeasible demonstration)
            result = ActionExecutionResult(
                actionId="ACT-04",
                executedAt=now_str,
                success=False,
                message="Action Rejected: Requested battery discharge exceeds safe minimum depth of discharge (15% <= 20% safe floor).",
                beforeState=ActionStateSnapshot(
                    b3Voltage=1.074,
                    f02LoadingPercent=108.0,
                    solarUsedKw=240.0,
                    batterySocPercent=15.0,
                    violationsCount=2,
                ),
                afterState=ActionAfterStateSnapshot(
                    b3Voltage=1.068,
                    f02LoadingPercent=105.0,
                    solarUsedKw=240.0,
                    batterySocPercent=15.0,
                    violationsCount=2,
                    renewableUseMaintainedPercent=100.0,
                    isSafe=False,
                ),
            )
        else:
            raise ResourceNotFoundException("Action", action_id)

        await self.repository.save_execution_result(result)
        return result
