import datetime
from typing import List, Optional
from app.db.repositories.scenario_repository import ScenarioRepository
from app.schemas.scenario import GridScenario, ScenarioExecutionResponse, ScenarioCreate, ScenarioUpdate
from app.core.exceptions import ResourceNotFoundException


class ScenarioService:
    def __init__(self):
        self.repository = ScenarioRepository()

    async def list_scenarios(self) -> List[GridScenario]:
        return await self.repository.list_scenarios()

    async def get_scenario(self, scenario_id: str) -> GridScenario:
        scenario = await self.repository.get_by_id(scenario_id)
        if not scenario:
            raise ResourceNotFoundException("Scenario", scenario_id)
        return scenario

    async def create_scenario(self, data: ScenarioCreate) -> GridScenario:
        return await self.repository.create(data)

    async def update_scenario(self, scenario_id: str, data: ScenarioUpdate) -> GridScenario:
        scenario = await self.repository.update(scenario_id, data)
        if not scenario:
            raise ResourceNotFoundException("Scenario", scenario_id)
        return scenario

    async def delete_scenario(self, scenario_id: str) -> bool:
        return await self.repository.delete(scenario_id)

    async def run_scenario(self, scenario_id: str) -> ScenarioExecutionResponse:
        scenario = await self.get_scenario(scenario_id)
        now_str = datetime.datetime.now().strftime("%H:%M")
        is_infeasible = (scenario.id == "EXTREME_INFEASIBLE")

        return ScenarioExecutionResponse(
            scenario=scenario,
            executedAt=now_str,
            initialViolations=scenario.violationsExpected,
            resolvedViolations=0 if is_infeasible else scenario.violationsExpected,
            recommendedAction=scenario.recommendedActionHint,
            isFeasible=not is_infeasible,
        )
