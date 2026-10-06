from typing import Dict, List, Optional
from app.db.supabase import get_supabase_client
from app.schemas.scenario import GridScenario, ScenarioCreate, ScenarioUpdate
from app.core.logging import logger

_MEMORY_SCENARIOS: Dict[str, GridScenario] = {}


def seed_memory_scenarios():
    default_scenarios = [
        GridScenario(
            id="NORMAL_DAY",
            name="Normal Day (Balanced Diurnal)",
            description="Balanced distributed generation and residential/commercial demand with no statutory threshold violations.",
            solarKw=95,
            loadKw=110,
            batterySocPercent=70,
            expectedCondition="Grid operating within safe operational margins (0.95 - 1.05 pu, line loading < 70%).",
            status="optimal",
            violationsExpected=0,
            recommendedActionHint="No intervention required. Optimal power flow maintained.",
            simulatedTime="10:00",
            gridType="any",
            peakVoltagePu=1.012,
            maxFeederLoadingPct=64.0,
            vufPercent=0.8,
            tags=["Baseline", "IEEE 1547", "Optimal", "Daytime"],
        ),
        GridScenario(
            id="HIGH_SOLAR",
            name="High Solar (Midday Reverse Backfeed)",
            description="Intense noon solar irradiance creating reverse power flow, Bus 3 voltage rise (1.074 pu), and Feeder F-02 thermal overload (108%).",
            solarKw=240,
            loadKw=120,
            batterySocPercent=62,
            expectedCondition="Over-voltage detected at B3 (> 1.05 pu); branch thermal congestion on F-02 (> 100%).",
            status="critical",
            violationsExpected=2,
            recommendedActionHint="Feeder Reconfiguration (F-02 → F-03) or BESS Smart Charging Dispatch.",
            simulatedTime="13:15",
            gridType="industrial",
            peakVoltagePu=1.074,
            maxFeederLoadingPct=108.0,
            vufPercent=1.2,
            tags=["High Solar", "Reverse Power", "Thermal Overload", "11 kV Feeder"],
        ),
        GridScenario(
            id="EVENING_PEAK",
            name="Evening Peak (Post-Sunset Surge)",
            description="Post-sunset consumer demand surge across residential and commercial sectors with zero solar generation.",
            solarKw=15,
            loadKw=155,
            batterySocPercent=35,
            expectedCondition="Substation feeder load warning (102%) and end-of-line voltage sag at Bus 4.",
            status="warning",
            violationsExpected=1,
            recommendedActionHint="Dispatch BESS unit (+40 kW discharge) or shed non-critical flexible loads.",
            simulatedTime="19:30",
            gridType="any",
            peakVoltagePu=0.985,
            maxFeederLoadingPct=102.0,
            vufPercent=1.5,
            tags=["Evening Peak", "Demand Surge", "Voltage Sag", "Peak Shaving"],
        ),
        GridScenario(
            id="HIGH_SOLAR_LOW_LOAD",
            name="High Solar + Low Load (Weekend Minimum)",
            description="Maximum solar generation during weekend holiday with minimal industrial activity causing severe voltage rise (> 1.08 pu).",
            solarKw=250,
            loadKw=55,
            batterySocPercent=88,
            expectedCondition="Severe over-voltage (1.085 pu) at Bus 2 & Bus 3 and heavy reverse backfeed.",
            status="critical",
            violationsExpected=3,
            recommendedActionHint="Coordinated Volt-VAR absorption, BESS rapid charging, and selective curtailment.",
            simulatedTime="12:30",
            gridType="industrial",
            peakVoltagePu=1.085,
            maxFeederLoadingPct=112.0,
            vufPercent=1.4,
            tags=["Weekend Low Load", "Severe Swell", "Reverse Flow", "Voltage Violations"],
        ),
        GridScenario(
            id="EXTREME_INFEASIBLE",
            name="Extreme Infeasible (Depleted Storage Reserve)",
            description="Grid emergency event where battery SOC is severely depleted (15%) and requested corrective discharge is physically infeasible.",
            solarKw=245,
            loadKw=160,
            batterySocPercent=15,
            expectedCondition="Critical overload with exhausted storage reserve (< 20% safe floor limit).",
            status="infeasible",
            violationsExpected=3,
            recommendedActionHint="Automated constraint auditor: Requested battery dispatch exceeds safe operating limits (Not Feasible).",
            simulatedTime="14:00",
            gridType="industrial",
            peakVoltagePu=1.072,
            maxFeederLoadingPct=106.0,
            vufPercent=1.3,
            tags=["Constraint Audit", "Battery Depleted", "Physical Infeasibility", "Anti-Hallucination"],
        ),
        GridScenario(
            id="STORM_CLOUD_RAMP",
            name="Storm Cloud Transit (Rapid Ramp Drop)",
            description="Passing thunderstorm drops aggregate solar generation from 240 kW to 35 kW within 15 minutes while load remains high (140 kW).",
            solarKw=35,
            loadKw=140,
            batterySocPercent=55,
            expectedCondition="Sudden voltage drop and feeder flow reversal; tests rapid BESS ramp rate response.",
            status="warning",
            violationsExpected=1,
            recommendedActionHint="Activate fast-response BESS inverter ramp support (+35 kW) to dampen bus voltage delta.",
            simulatedTime="14:45",
            gridType="industrial",
            peakVoltagePu=0.962,
            maxFeederLoadingPct=88.0,
            vufPercent=1.1,
            tags=["Transient Ramp", "Weather Disturbance", "Fast BESS", "Real-World Test Case"],
        ),
        GridScenario(
            id="EV_CHARGING_SURGE",
            name="Clustered EV Charging (Demand Shock)",
            description="Simultaneous connection of residential & commercial EV fast chargers adding 70 kW of demand during moderate solar hours.",
            solarKw=110,
            loadKw=195,
            batterySocPercent=65,
            expectedCondition="Transformer loading exceeds 104% and feeder head current approaches thermal ampacity limit.",
            status="warning",
            violationsExpected=2,
            recommendedActionHint="Modulate smart charging rate via ISO 15118 (V1G) and initiate battery peak shaving.",
            simulatedTime="18:15",
            gridType="any",
            peakVoltagePu=0.952,
            maxFeederLoadingPct=104.5,
            vufPercent=1.6,
            tags=["EV Fleet", "V1G Smart Charging", "Transformer Stress", "Demand Shock"],
        ),
        GridScenario(
            id="PHASE_UNBALANCE_PEAK",
            name="Rooftop Phase Unbalance (3-Phase LV Mismatch)",
            description="Asymmetric single-phase rooftop solar export concentrated on Phase L2 (House 08 & House 02) causing severe Voltage Unbalance Factor (VUF 3.2%).",
            solarKw=180,
            loadKw=95,
            batterySocPercent=58,
            expectedCondition="Voltage Unbalance Factor exceeds 2.0% limit (EN 50160) and heavy transformer neutral return current.",
            status="critical",
            violationsExpected=2,
            recommendedActionHint="Dynamic Phase Rebalancing: Switch House 08 connection from Phase L2 to Phase L1.",
            simulatedTime="13:00",
            gridType="domestic",
            peakVoltagePu=1.092,
            maxFeederLoadingPct=94.0,
            vufPercent=3.2,
            tags=["Domestic LV", "Phase Unbalance", "VUF > 2.0%", "Neutral Shift", "EN 50160"],
        ),
        GridScenario(
            id="NIGHT_QUIET",
            name="Night Quiet Baseload (Off-Peak Stability)",
            description="Midnight minimum quiescent load (45 kW) with zero solar and off-peak battery trickle charging from grid.",
            solarKw=0,
            loadKw=45,
            batterySocPercent=40,
            expectedCondition="Optimal stable operation; flat voltage profile (1.002 pu) and minimal branch losses.",
            status="optimal",
            violationsExpected=0,
            recommendedActionHint="No intervention required. Ideal window for off-peak BESS grid charging.",
            simulatedTime="02:00",
            gridType="any",
            peakVoltagePu=1.002,
            maxFeederLoadingPct=22.0,
            vufPercent=0.4,
            tags=["Off-Peak", "Baseload", "Nocturnal", "Minimal Loss"],
        ),
    ]
    for s in default_scenarios:
        _MEMORY_SCENARIOS[s.id] = s


seed_memory_scenarios()


class ScenarioRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def list_scenarios(self) -> List[GridScenario]:
        merged = dict(_MEMORY_SCENARIOS)
        if self.supabase:
            try:
                res = self.supabase.table("scenarios").select("*").execute()
                if res.data:
                    for row in res.data:
                        s_id = row.get("id")
                        if not s_id:
                            continue
                        # If row already exists in memory defaults, preserve the rich defaults
                        if s_id not in merged:
                            merged[s_id] = GridScenario(
                                id=s_id,
                                name=row.get("name", s_id),
                                description=row.get("description", ""),
                                solarKw=float(row.get("solar_capacity_kw", 100)),
                                loadKw=100.0,
                                batterySocPercent=60.0,
                                expectedCondition=row.get("description", ""),
                                status="critical" if "HIGH" in s_id else "optimal",
                                violationsExpected=2 if "HIGH" in s_id else 0,
                                recommendedActionHint="Inspect power flow telemetry",
                                simulatedTime="13:15",
                            )
            except Exception as e:
                logger.warning(f"Error reading scenarios from Supabase: {e}")

        return list(merged.values())

    async def get_by_id(self, scenario_id: str) -> Optional[GridScenario]:
        if scenario_id in _MEMORY_SCENARIOS:
            return _MEMORY_SCENARIOS[scenario_id]

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
