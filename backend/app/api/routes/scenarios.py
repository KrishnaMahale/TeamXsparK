from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.scenario import (
    GridScenario,
    ScenarioExecutionResponse,
    ScenarioCreate,
    ScenarioUpdate,
)
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


def get_scenario_service():
    return ScenarioService()


@router.get("", response_model=List[GridScenario])
async def list_scenarios(service: ScenarioService = Depends(get_scenario_service)):
    return await service.list_scenarios()


@router.post("", response_model=GridScenario, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: ScenarioCreate,
    service: ScenarioService = Depends(get_scenario_service),
):
    return await service.create_scenario(scenario_data)


@router.get("/{scenario_id}", response_model=GridScenario)
async def get_scenario(
    scenario_id: str,
    service: ScenarioService = Depends(get_scenario_service),
):
    return await service.get_scenario(scenario_id)


@router.put("/{scenario_id}", response_model=GridScenario)
async def update_scenario(
    scenario_id: str,
    update_data: ScenarioUpdate,
    service: ScenarioService = Depends(get_scenario_service),
):
    return await service.update_scenario(scenario_id, update_data)


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    service: ScenarioService = Depends(get_scenario_service),
):
    await service.delete_scenario(scenario_id)
    return {"message": f"Scenario {scenario_id} deleted successfully."}


@router.post("/{scenario_id}/run", response_model=ScenarioExecutionResponse)
async def run_scenario(
    scenario_id: str,
    grid_id: Optional[str] = Query(None, description="Target network grid ID"),
    grid_type: Optional[str] = Query(None, description="Target grid type (industrial or domestic)"),
    service: ScenarioService = Depends(get_scenario_service),
):
    return await service.run_scenario(scenario_id, grid_id=grid_id, grid_type=grid_type)
