import uuid
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Body, status
from app.schemas.simulation import (
    SimulationInput,
    FullSimulationResult,
    PowerFlowResult,
    SimulationResponse,
    SingleTimePowerFlowRequest,
    SimulationCreateRequest,
    SimulationCreateResponse,
)
from app.schemas.action import ActionExecutionResult, ActionCandidateRequest
from app.services.simulation_service import SimulationService
from app.services.action_service import ActionService

router = APIRouter(tags=["Simulations"])


def get_sim_service():
    return SimulationService()


def get_act_service():
    return ActionService()


# 1. Full Simulation Execution (Used by SimulationSetupPage)
@router.post("/simulations/run", response_model=FullSimulationResult)
async def run_full_simulation(
    input_data: SimulationInput,
    sim_service: SimulationService = Depends(get_sim_service),
):
    return await sim_service.run_simulation(input_data)


@router.post("/simulations", response_model=SimulationCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    request: SimulationCreateRequest = Body(...),
    sim_service: SimulationService = Depends(get_sim_service),
):
    sim_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
    return SimulationCreateResponse(simulation_id=sim_id, status="PREPARING")


@router.post("/simulations/{simulation_id}/run", response_model=FullSimulationResult)
async def run_simulation_by_id(
    simulation_id: str,
    input_data: Optional[SimulationInput] = Body(None),
    sim_service: SimulationService = Depends(get_sim_service),
):
    data = input_data or SimulationInput(scenarioName=simulation_id)
    return await sim_service.run_simulation(data)


@router.get("/simulations/{simulation_id}", response_model=FullSimulationResult)
async def get_simulation(
    simulation_id: str,
    sim_service: SimulationService = Depends(get_sim_service),
):
    return await sim_service.get_simulation(simulation_id)


@router.get("/simulations/{simulation_id}/results")
async def get_simulation_results(
    simulation_id: str,
    sim_service: SimulationService = Depends(get_sim_service),
):
    sim = await sim_service.get_simulation(simulation_id)
    return sim.timeStepResults


# 2. Power-flow for Single Timestamp (Used by simulationService.runPowerFlow)
@router.post("/simulation/power-flow", response_model=PowerFlowResult)
async def run_power_flow(
    request: SingleTimePowerFlowRequest,
    sim_service: SimulationService = Depends(get_sim_service),
):
    return await sim_service.run_single_power_flow(request.time, request.scenarioId)


# 3. Corrective Actions Evaluation (Used by simulationService.runCorrectiveActions)
@router.post("/simulation/corrective-actions", response_model=SimulationResponse)
async def run_corrective_actions(
    act_service: ActionService = Depends(get_act_service),
):
    return await act_service.evaluate_actions_for_simulation()


# 4. Action Execution (Used by simulationService.executeAction)
@router.post("/simulation/actions/{action_id}/execute", response_model=ActionExecutionResult)
async def execute_action(
    action_id: str,
    act_service: ActionService = Depends(get_act_service),
):
    return await act_service.execute_action(action_id)


@router.post("/simulations/{simulation_id}/actions/{action_id}/simulate", response_model=ActionExecutionResult)
async def simulate_action(
    simulation_id: str,
    action_id: str,
    act_service: ActionService = Depends(get_act_service),
):
    return await act_service.execute_action(action_id)


@router.post("/simulations/{simulation_id}/actions")
async def evaluate_custom_action(
    simulation_id: str,
    request: ActionCandidateRequest,
    act_service: ActionService = Depends(get_act_service),
):
    return {
        "simulation_id": simulation_id,
        "action_type": request.action_type,
        "evaluated": True,
        "parameters": request.parameters,
    }
