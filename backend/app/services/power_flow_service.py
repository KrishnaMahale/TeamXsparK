from typing import List, Tuple
from app.engine.power_flow import PowerFlowEngine
from app.schemas.network import Bus, Feeder


class PowerFlowService:
    @staticmethod
    def calculate_power_flow(
        solar_kw: float,
        load_kw: float,
        battery_power_kw: float = 0.0,
        solar_curtailment_kw: float = 0.0,
        installed_capacity_kw: float = 250.0,
        is_alternative_topology: bool = False,
    ) -> Tuple[List[Bus], List[Feeder], float, float]:
        solver = PowerFlowEngine(is_alternative_topology=is_alternative_topology)
        return solver.solve(
            solar_kw=solar_kw,
            load_kw=load_kw,
            battery_power_kw=battery_power_kw,
            solar_curtailment_kw=solar_curtailment_kw,
            installed_solar_capacity_kw=installed_capacity_kw,
        )
