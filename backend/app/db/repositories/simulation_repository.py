import datetime
from typing import Dict, Optional
from app.db.supabase import get_supabase_client
from app.schemas.simulation import FullSimulationResult
from app.core.logging import logger

_MEMORY_SIMULATIONS: Dict[str, FullSimulationResult] = {}
_MEMORY_STATUSES: Dict[str, str] = {}

VALID_SCENARIO_IDS = {
    "NORMAL_DAY",
    "HIGH_SOLAR",
    "EVENING_PEAK",
    "HIGH_SOLAR_LOW_LOAD",
    "EXTREME_INFEASIBLE",
}


def resolve_valid_scenario_id(name_or_id: Optional[str]) -> Optional[str]:
    if not name_or_id:
        return None
    cleaned = name_or_id.upper().replace(" ", "_").replace("+", "").replace("__", "_")
    for s_id in VALID_SCENARIO_IDS:
        if s_id in cleaned or cleaned in s_id or s_id.replace("_", "") in cleaned:
            return s_id
    return None


class SimulationRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def save_simulation(self, simulation_id: str, result: FullSimulationResult, status: str = "COMPLETE"):
        _MEMORY_SIMULATIONS[simulation_id] = result
        _MEMORY_STATUSES[simulation_id] = status

        if self.supabase:
            try:
                valid_scenario_fk = resolve_valid_scenario_id(result.scenarioId or result.input.scenarioName)

                # 1. Save main simulation record
                self.supabase.table("simulations").upsert({
                    "id": simulation_id,
                    "scenario_id": valid_scenario_fk,  # NULL or valid foreign key
                    "status": status,
                    "completed_at": datetime.datetime.now().isoformat(),
                    "input_snapshot": result.input.model_dump(),
                }).execute()

                # 2. Save time-step results in batch
                step_records = []
                for t, pf in result.timeStepResults.items():
                    step_records.append({
                        "simulation_id": simulation_id,
                        "timestamp": t,
                        "solar_generation_kw": pf.totalGenerationKw,
                        "load_demand_kw": pf.totalDemandKw,
                        "net_power_kw": pf.totalGenerationKw - pf.totalDemandKw,
                        "bus_results": [b.model_dump() for b in pf.buses],
                        "feeder_results": [f.model_dump() for f in pf.feeders],
                        "transformer_results": {},
                        "battery_soc_pct": pf.batterySocPercent or 60.0,
                        "violation_count": len(pf.violations),
                    })

                if step_records:
                    self.supabase.table("simulation_results").upsert(step_records).execute()

                # 3. Save violations
                viol_records = []
                for t, pf in result.timeStepResults.items():
                    for v in pf.violations:
                        viol_records.append({
                            "id": f"{simulation_id}-{v.id}",
                            "simulation_id": simulation_id,
                            "timestamp": v.time,
                            "component_type": v.componentType,
                            "component_id": v.componentId,
                            "violation_type": v.type.value if hasattr(v.type, "value") else str(v.type),
                            "actual_value": v.value,
                            "limit_value": v.limit,
                            "severity": v.severity.value if hasattr(v.severity, "value") else str(v.severity),
                            "message": f"{v.componentName}: {v.issue} ({v.formattedValue} vs limit {v.formattedLimit})",
                            "resolved": (v.status == "resolved"),
                        })

                if viol_records:
                    self.supabase.table("violations").upsert(viol_records).execute()

                logger.info(f"Successfully persisted simulation {simulation_id} to Supabase with scenario_id={valid_scenario_fk}.")

            except Exception as e:
                logger.warning(f"Error persisting simulation {simulation_id} in Supabase: {e}")

    async def get_simulation(self, simulation_id: str) -> Optional[FullSimulationResult]:
        return _MEMORY_SIMULATIONS.get(simulation_id)

    async def get_status(self, simulation_id: str) -> str:
        return _MEMORY_STATUSES.get(simulation_id, "COMPLETE")

    async def set_status(self, simulation_id: str, status: str):
        _MEMORY_STATUSES[simulation_id] = status
