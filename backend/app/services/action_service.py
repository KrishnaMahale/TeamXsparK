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
from app.engine.network_engine import NetworkEngine
from app.core.exceptions import ResourceNotFoundException


class ActionService:
    def __init__(self):
        self.repository = ActionRepository()

    async def evaluate_actions_for_simulation(
        self,
        simulation_input: Optional[SimulationInput] = None
    ) -> SimulationResponse:
        from app.db.repositories.network_repository import NetworkRepository
        from app.services.simulation_service import get_active_simulation
        repo = NetworkRepository()
        target_grid_id = (simulation_input.gridId if simulation_input else None) or await repo.get_active_grid_id()
        grid = await repo.get_grid(target_grid_id)
        if not grid:
            grid = await repo.get_network()

        active_sim = get_active_simulation()
        if simulation_input and simulation_input.solarTimeSeries:
            input_data = simulation_input
            if not input_data.gridId:
                input_data.gridId = target_grid_id
            full_res = NetworkEngine.run_full_simulation(input_data, grid)
        elif active_sim and (not target_grid_id or active_sim.input.gridId == target_grid_id):
            full_res = active_sim
        else:
            input_data = simulation_input or SimulationInput(gridId=target_grid_id)
            if not input_data.gridId:
                input_data.gridId = target_grid_id
            full_res = NetworkEngine.run_full_simulation(input_data, grid)

        peak_key = "13:15" if "13:15" in full_res.timeStepResults else list(full_res.timeStepResults.keys())[0]
        peak_flow = full_res.timeStepResults[peak_key]

        return SimulationResponse(
            powerFlow=peak_flow,
            availableActions=full_res.availableActions,
            recommendedActionId=full_res.recommendedActionId,
            comparisonData=full_res.comparisonData,
        )

    async def execute_action(self, action_id: str, grid_id: Optional[str] = None) -> ActionExecutionResult:
        now_str = datetime.datetime.now().isoformat()
        from app.db.repositories.network_repository import NetworkRepository
        from app.services.simulation_service import get_active_simulation

        repo = NetworkRepository()
        target_grid_id = grid_id or await repo.get_active_grid_id()
        grid = await repo.get_grid(target_grid_id)
        if not grid:
            grid = await repo.get_network()

        # Get active simulation or run for current grid
        active_sim = get_active_simulation()
        if not active_sim or (active_sim.input and active_sim.input.gridId and active_sim.input.gridId != target_grid_id):
            full_res = NetworkEngine.run_full_simulation(SimulationInput(gridId=target_grid_id), grid)
        else:
            full_res = active_sim

        target_action = next((a for a in full_res.availableActions if a.id == action_id), None)
        if not target_action:
            raise ResourceNotFoundException("Action", action_id)

        comp = full_res.comparisonData
        crit_bus_v_before = comp.b3Voltage.before
        crit_f_load_before = comp.f02Loading.before
        base_viols = comp.beforeViolationsCount if comp.beforeViolationsCount is not None else 2

        v_after = target_action.expectedVoltagePu
        f_after = target_action.expectedFeederLoadPercent
        viols_after = target_action.remainingViolationsCount
        is_safe = target_action.isFeasible and viols_after == 0

        if target_action.isFeasible:
            msg = (
                f"{target_action.title} executed successfully on {grid.name}. "
                f"Monitored voltage adjusted to {v_after:.3f} pu, feeder loading to {f_after:.1f}%."
            )
        else:
            msg = f"Action Rejected: {target_action.infeasibleReason or 'Operating constraint violation.'}"

        result = ActionExecutionResult(
            actionId=action_id,
            executedAt=now_str,
            success=target_action.isFeasible,
            message=msg,
            beforeState=ActionStateSnapshot(
                b3Voltage=crit_bus_v_before,
                f02LoadingPercent=crit_f_load_before,
                solarUsedKw=comp.solarUsed.before,
                batterySocPercent=comp.batterySoc.before,
                violationsCount=base_viols,
                monitoredBusId=comp.monitoredBusId,
                monitoredBusName=comp.monitoredBusName,
                monitoredFeederId=comp.monitoredFeederId,
                monitoredFeederName=comp.monitoredFeederName,
                gridId=grid.id,
                gridName=grid.name,
            ),
            afterState=ActionAfterStateSnapshot(
                b3Voltage=v_after,
                f02LoadingPercent=f_after,
                solarUsedKw=target_action.solarUsedKw,
                batterySocPercent=target_action.batterySocPercent,
                violationsCount=viols_after,
                renewableUseMaintainedPercent=target_action.renewableUtilizationPercent,
                isSafe=is_safe,
                monitoredBusId=comp.monitoredBusId,
                monitoredBusName=comp.monitoredBusName,
                monitoredFeederId=comp.monitoredFeederId,
                monitoredFeederName=comp.monitoredFeederName,
                gridId=grid.id,
                gridName=grid.name,
            ),
        )

        await self.repository.save_execution_result(result)
        return result
