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

    async def run_scenario(
        self,
        scenario_id: str,
        grid_id: Optional[str] = None,
        grid_type: Optional[str] = None,
    ) -> ScenarioExecutionResponse:
        scenario = await self.get_scenario(scenario_id)
        now_str = datetime.datetime.now().strftime("%H:%M")
        eff_grid_type = grid_type or scenario.gridType

        if eff_grid_type == "domestic":
            from app.engine.domestic_engine import DomesticDistFlowEngine
            dom_engine = DomesticDistFlowEngine()
            dom_net = dom_engine.solve(
                time_str=scenario.simulatedTime,
                preset=scenario.id,
            )

            voltages = [h.telemetry.voltageV for h in dom_net.houses]
            pu_voltages = [h.telemetry.voltagePu for h in dom_net.houses]
            v_max_pu = max(pu_voltages) if pu_voltages else 1.0
            v_min_pu = min(pu_voltages) if pu_voltages else 1.0
            vuf = max((h.telemetry.voltageUnbalanceFactorPercent for h in dom_net.houses), default=0.8)
            tx_loading = dom_net.transformer.loadingPercent
            initial_viols = len(dom_net.violations)
            is_infeasible = (scenario.id == "EXTREME_INFEASIBLE")

            return ScenarioExecutionResponse(
                scenario=scenario,
                executedAt=now_str,
                initialViolations=initial_viols,
                resolvedViolations=0 if is_infeasible else initial_viols,
                recommendedAction=scenario.recommendedActionHint,
                isFeasible=not is_infeasible,
                gridType="domestic",
                voltageMaxPu=v_max_pu,
                voltageMinPu=v_min_pu,
                feederLoadingMaxPct=dom_net.transformer.loadingPercent,
                transformerLoadingPct=tx_loading,
                lossesKw=round(dom_net.transformer.currentLoadKw * 0.04, 2),
                vufPercent=vuf,
                violations=[v.model_dump() for v in dom_net.violations],
                powerFlowResult=dom_net.model_dump(),
            )

        # Industrial 11 kV Power Flow
        from app.db.repositories.network_repository import NetworkRepository
        from app.engine.power_flow import PowerFlowEngine
        from app.engine.constraints import ConstraintChecker
        from app.engine.actions import ActionEngine
        from app.schemas.battery import BatteryStorageConfig
        from app.schemas.simulation import NetworkLimitsConfig

        net_repo = NetworkRepository()
        target_grid_id = grid_id
        if not target_grid_id and grid_type:
            if grid_type == "industrial":
                target_grid_id = "default-grid"
            elif grid_type == "domestic":
                target_grid_id = "domestic-grid"
        if not target_grid_id:
            target_grid_id = await net_repo.get_active_grid_id()

        grid = await net_repo.get_grid(target_grid_id)
        if not grid:
            grid = await net_repo.get_network()

        pf_engine = PowerFlowEngine(is_alternative_topology=False)
        buses, feeders, losses, tx_loading = pf_engine.solve(
            grid=grid,
            solar_kw=scenario.solarKw,
            load_kw=scenario.loadKw,
            installed_solar_capacity_kw=250.0,
        )

        limits = NetworkLimitsConfig(
            voltageMinPu=0.95,
            voltageMaxPu=1.05,
            feederLoadingLimitPercent=100.0,
            transformerLoadingLimitPercent=100.0,
        )
        step_violations = ConstraintChecker.check_all(
            buses, feeders, scenario.simulatedTime, limits
        )

        b_cfg = BatteryStorageConfig(
            capacityKwh=100.0,
            initialSocPercent=scenario.batterySocPercent,
            maxChargeKw=40.0,
            maxDischargeKw=40.0,
        )
        actions, recommended_id, comparison_data = ActionEngine.evaluate_candidate_actions(
            peak_solar_kw=scenario.solarKw,
            peak_load_kw=scenario.loadKw,
            battery_config=b_cfg,
            v_max=1.05,
            feeder_max=100.0,
            installed_capacity_kw=250.0,
            grid=grid,
        )

        rec_obj = next((a for a in actions if a.id == recommended_id), None)
        rec_title = rec_obj.title if rec_obj else scenario.recommendedActionHint
        if len(step_violations) == 0:
            rec_title = "Optimal power flow maintained (No intervention required)"

        is_infeasible = (scenario.id == "EXTREME_INFEASIBLE" or scenario.batterySocPercent <= 15.0)

        v_max_pu = max((b.voltage for b in buses), default=1.0)
        v_min_pu = min((b.voltage for b in buses), default=1.0)
        max_feeder_pct = max((f.loadingPercent for f in feeders), default=50.0)

        return ScenarioExecutionResponse(
            scenario=scenario,
            executedAt=now_str,
            initialViolations=len(step_violations),
            resolvedViolations=0 if is_infeasible else len(step_violations),
            recommendedAction=rec_title,
            isFeasible=not is_infeasible,
            gridType="industrial",
            voltageMaxPu=v_max_pu,
            voltageMinPu=v_min_pu,
            feederLoadingMaxPct=max_feeder_pct,
            transformerLoadingPct=tx_loading,
            lossesKw=losses,
            vufPercent=0.8,
            violations=[v.model_dump() for v in step_violations],
            powerFlowResult={
                "buses": [b.model_dump() for b in buses],
                "feeders": [f.model_dump() for f in feeders],
                "totalLossKw": losses,
                "transformerLoadingPercent": tx_loading,
                "totalGenerationKw": scenario.solarKw,
                "totalDemandKw": scenario.loadKw,
            },
            availableActions=[a.model_dump() for a in actions],
            comparisonData=comparison_data.model_dump() if comparison_data else None,
        )
