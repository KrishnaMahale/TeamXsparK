from typing import Dict, List, Optional
from app.db.supabase import get_supabase_client
from app.schemas.scenario import GridScenario, ScenarioCreate, ScenarioUpdate
from app.core.logging import logger

_MEMORY_SCENARIOS: Dict[str, GridScenario] = {}


def seed_memory_scenarios():
    default_scenarios = [
        GridScenario(
            id="NORMAL_DAY",
            name="Normal Day",
            description="Balanced generation and distributed residential/commercial demand with no threshold violations.",
            solarKw=95,
            loadKw=110,
            batterySocPercent=70,
            expectedCondition="Grid operating within safe operational margins (0.95 - 1.05 pu).",
            status="optimal",
            violationsExpected=0,
            recommendedActionHint="No intervention required. Optimal power flow maintained.",
            simulatedTime="10:00",
        ),
        GridScenario(
            id="HIGH_SOLAR",
            name="High Solar",
            description="Intense noon solar irradiance creating reverse power flow, Bus 3 voltage rise (1.074 pu), and Feeder F-02 thermal overload (108%).",
            solarKw=240,
            loadKw=120,
            batterySocPercent=62,
            expectedCondition="Over-voltage detected at B3; branch congestion on F-02.",
            status="critical",
            violationsExpected=2,
            recommendedActionHint="Feeder Reconfiguration (F-02 → F-03) or Battery Charging/Discharge Dispatch.",
            simulatedTime="13:15",
        ),
        GridScenario(
            id="EVENING_PEAK",
            name="Evening Peak",
            description="Post-sunset demand surge across residential and industrial sectors with negligible solar contribution.",
            solarKw=15,
            loadKw=155,
            batterySocPercent=35,
            expectedCondition="Substation feeder load warning (102%) and low battery reserve warning.",
            status="warning",
            violationsExpected=1,
            recommendedActionHint="Dispatch battery storage or shed non-critical flexible loads.",
            simulatedTime="19:30",
        ),
        GridScenario(
            id="HIGH_SOLAR_LOW_LOAD",
            name="High Solar + Low Load",
            description="Maximum generation during weekend holiday with minimal commercial activity causing severe voltage rise.",
            solarKw=250,
            loadKw=55,
            batterySocPercent=88,
            expectedCondition="Severe over-voltage (1.085 pu) at Bus 2 & Bus 3.",
            status="critical",
            violationsExpected=3,
            recommendedActionHint="Coordinated solar curtailment and maximum battery charging.",
            simulatedTime="12:30",
        ),
        GridScenario(
            id="EXTREME_INFEASIBLE",
            name="Extreme / Infeasible Scenario",
            description="Grid emergency event where battery SOC is severely depleted (15%) and requested corrective discharge is physically infeasible.",
            solarKw=245,
            loadKw=160,
            batterySocPercent=15,
            expectedCondition="Critical overload and voltage violation with exhausted energy storage reserve.",
            status="infeasible",
            violationsExpected=3,
            recommendedActionHint="Automated warning: Requested battery dispatch exceeds safe operating limits (Not Feasible).",
            simulatedTime="14:00",
        ),
    ]
    for s in default_scenarios:
        _MEMORY_SCENARIOS[s.id] = s


seed_memory_scenarios()


class ScenarioRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def list_scenarios(self) -> List[GridScenario]:
        if self.supabase:
            try:
                res = self.supabase.table("scenarios").select("*").execute()
                if res.data:
                    return [
                        GridScenario(
                            id=row["id"],
                            name=row["name"],
                            description=row.get("description", ""),
                            solarKw=float(row.get("solar_capacity_kw", 100)),
                            loadKw=100.0,
                            batterySocPercent=60.0,
                            expectedCondition=row.get("description", ""),
                            status="critical" if "HIGH" in row["id"] else "optimal",
                            violationsExpected=2 if "HIGH" in row["id"] else 0,
                            recommendedActionHint="Inspect power flow telemetry",
                            simulatedTime="13:15",
                        )
                        for row in res.data
                    ]
            except Exception as e:
                logger.warning(f"Error reading scenarios from Supabase: {e}")

        return list(_MEMORY_SCENARIOS.values())

    async def get_by_id(self, scenario_id: str) -> Optional[GridScenario]:
        if self.supabase:
            try:
                res = self.supabase.table("scenarios").select("*").eq("id", scenario_id).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    return GridScenario(
                        id=row["id"],
                        name=row["name"],
                        description=row.get("description", ""),
                        solarKw=float(row.get("solar_capacity_kw", 100)),
                        loadKw=100.0,
                        batterySocPercent=60.0,
                        expectedCondition=row.get("description", ""),
                        status="critical" if "HIGH" in row["id"] else "optimal",
                        violationsExpected=2 if "HIGH" in row["id"] else 0,
                        recommendedActionHint="Inspect power flow telemetry",
                        simulatedTime="13:15",
                    )
            except Exception as e:
                logger.warning(f"Error fetching scenario {scenario_id} from Supabase: {e}")

        return _MEMORY_SCENARIOS.get(scenario_id)

    async def create(self, scenario_data: ScenarioCreate) -> GridScenario:
        import uuid
        scenario_id = scenario_data.scenario_type if scenario_data.scenario_type in _MEMORY_SCENARIOS else f"SCENARIO-{uuid.uuid4().hex[:8].upper()}"
        scenario = GridScenario(
            id=scenario_id,
            name=scenario_data.name,
            description=scenario_data.description or "",
            solarKw=scenario_data.solar_capacity_kw,
            loadKw=100.0,
            batterySocPercent=60.0,
            expectedCondition="Custom configured grid scenario",
            status="optimal",
            violationsExpected=0,
            recommendedActionHint="Run power flow simulation to evaluate",
            simulatedTime="12:00",
        )
        _MEMORY_SCENARIOS[scenario_id] = scenario

        if self.supabase:
            try:
                self.supabase.table("scenarios").upsert({
                    "id": scenario_id,
                    "name": scenario_data.name,
                    "description": scenario_data.description,
                    "scenario_type": scenario_data.scenario_type,
                    "solar_capacity_kw": scenario_data.solar_capacity_kw,
                    "network_config": scenario_data.network_config,
                    "battery_config": scenario_data.battery_config,
                }).execute()
            except Exception as e:
                logger.warning(f"Error saving scenario to Supabase: {e}")

        return scenario

    async def update(self, scenario_id: str, update_data: ScenarioUpdate) -> Optional[GridScenario]:
        scenario = await self.get_by_id(scenario_id)
        if not scenario:
            return None
        data = update_data.model_dump(exclude_unset=True)
        if "name" in data:
            scenario.name = data["name"]
        if "description" in data:
            scenario.description = data["description"]
        if "solar_capacity_kw" in data:
            scenario.solarKw = data["solar_capacity_kw"]
        _MEMORY_SCENARIOS[scenario_id] = scenario

        if self.supabase:
            try:
                self.supabase.table("scenarios").update(data).eq("id", scenario_id).execute()
            except Exception as e:
                logger.warning(f"Error updating scenario in Supabase: {e}")

        return scenario

    async def delete(self, scenario_id: str) -> bool:
        if scenario_id in _MEMORY_SCENARIOS:
            del _MEMORY_SCENARIOS[scenario_id]

        if self.supabase:
            try:
                self.supabase.table("scenarios").delete().eq("id", scenario_id).execute()
            except Exception as e:
                logger.warning(f"Error deleting scenario from Supabase: {e}")

        return True
