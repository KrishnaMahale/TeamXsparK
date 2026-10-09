import uuid
import math
from typing import Dict, List, Optional, Tuple
from app.db.repositories.simulation_repository import SimulationRepository
from app.schemas.simulation import (
    SimulationInput,
    FullSimulationResult,
    PowerFlowResult,
)
from app.engine.network_engine import NetworkEngine
from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.db.repositories.network_repository import NetworkRepository

# Module-level singletons to persist active simulation and active power-flow state
_ACTIVE_SIMULATION: Optional[FullSimulationResult] = None
_ACTIVE_POWER_FLOW: Optional[PowerFlowResult] = None


def get_active_power_flow() -> Optional[PowerFlowResult]:
    global _ACTIVE_POWER_FLOW
    return _ACTIVE_POWER_FLOW


def get_active_simulation() -> Optional[FullSimulationResult]:
    global _ACTIVE_SIMULATION
    return _ACTIVE_SIMULATION


def interpolate_power_at_time(time_str: str, input_data: SimulationInput) -> Tuple[float, float]:
    """
    Interpolates solar generation (kW) and load demand (kW) for any given timestamp string 'HH:MM'.
    """
    try:
        parts = time_str.split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        t_float = h + m / 60.0
    except Exception:
        t_float = 12.0

    # 1. Exact match in time series
    s_exact = next((s.solarKw for s in input_data.solarTimeSeries if s.time == time_str), None)
    l_exact = next((l.loadKw for l in input_data.loadTimeSeries if l.time == time_str), None)

    if s_exact is not None and l_exact is not None:
        return float(s_exact), float(l_exact)

    # 2. Linear interpolation if series points exist
    def interp_series(points, val_attr):
        if not points:
            return None
        parsed = []
        for p in points:
            try:
                ps = p.time.split(":")
                parsed.append((int(ps[0]) + int(ps[1]) / 60.0, float(getattr(p, val_attr))))
            except Exception:
                pass
        if not parsed:
            return None
        parsed.sort(key=lambda x: x[0])
        if t_float <= parsed[0][0]:
            return parsed[0][1]
        if t_float >= parsed[-1][0]:
            return parsed[-1][1]
        for i in range(len(parsed) - 1):
            t1, v1 = parsed[i]
            t2, v2 = parsed[i + 1]
            if t1 <= t_float <= t2:
                if t2 == t1:
                    return v1
                ratio = (t_float - t1) / (t2 - t1)
                return v1 + ratio * (v2 - v1)
        return parsed[-1][1]

    s_val = interp_series(input_data.solarTimeSeries, "solarKw") if s_exact is None else s_exact
    l_val = interp_series(input_data.loadTimeSeries, "loadKw") if l_exact is None else l_exact

    if s_val is not None and l_val is not None:
        return round(float(s_val), 1), round(float(l_val), 1)

    # 3. Physics-based model fallback
    cap = input_data.installedSolarCapacityKw or 250.0
    if 6.0 <= t_float <= 19.0:
        sun_factor = math.sin(((t_float - 6.0) / 13.0) * math.pi)
        calc_solar = max(0.0, cap * sun_factor)
    else:
        calc_solar = 0.0

    peak_l = input_data.peakLoadKw or 180.0
    load_factor = 0.35 + 0.30 * math.exp(-((t_float - 10.0) ** 2) / 8.0) + 0.35 * math.exp(-((t_float - 19.0) ** 2) / 8.0)
    calc_load = max(30.0, peak_l * min(1.0, load_factor))

    final_s = s_val if s_val is not None else calc_solar
    final_l = l_val if l_val is not None else calc_load
    return round(float(final_s), 1), round(float(final_l), 1)


class SimulationService:
    def __init__(self):
        self.repository = SimulationRepository()

    @property
    def active_simulation(self) -> Optional[FullSimulationResult]:
        global _ACTIVE_SIMULATION
        return _ACTIVE_SIMULATION

    @active_simulation.setter
    def active_simulation(self, val: Optional[FullSimulationResult]):
        global _ACTIVE_SIMULATION
        _ACTIVE_SIMULATION = val

    async def run_simulation(self, input_data: SimulationInput) -> FullSimulationResult:
        global _ACTIVE_SIMULATION, _ACTIVE_POWER_FLOW

        # Validate inputs
        if input_data.networkConfig.voltageMinPu >= input_data.networkConfig.voltageMaxPu:
            raise ValidationException("Minimum voltage cannot be greater than or equal to maximum voltage.")

        is_forecast = (
            input_data.simulationSource == "forecast"
            or (bool(input_data.scenarioName) and input_data.scenarioName.startswith("Day-Ahead Forecast"))
        )

        if is_forecast:
            if not input_data.solarTimeSeries or not input_data.loadTimeSeries:
                raise ValidationException("Forecast data unavailable")
            if len(input_data.solarTimeSeries) != 96 or len(input_data.loadTimeSeries) != 96:
                raise ValidationException(
                    f"Forecast must contain 96 points (solar={len(input_data.solarTimeSeries)}, load={len(input_data.loadTimeSeries)})"
                )

            expected_times = [f"{h:02d}:{m:02d}" for h in range(24) for m in (0, 15, 30, 45)]
            for idx, pt in enumerate(input_data.solarTimeSeries):
                if pt.time != expected_times[idx]:
                    raise ValidationException(
                        f"Forecast timestamps are not 15 minutes apart: solar point {idx} is '{pt.time}', expected '{expected_times[idx]}'"
                    )
            for idx, pt in enumerate(input_data.loadTimeSeries):
                if pt.time != expected_times[idx]:
                    raise ValidationException(
                        f"Forecast timestamps are not 15 minutes apart: load point {idx} is '{pt.time}', expected '{expected_times[idx]}'"
                    )

        sim_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
        
        repo = NetworkRepository()
        target_grid_id = input_data.gridId or await repo.get_active_grid_id()
        grid = await repo.get_grid(target_grid_id)
        if not grid:
            grid = await repo.get_network() # fallback

        res = NetworkEngine.run_full_simulation(input_data, grid)

        # Match scenarioId to a recognized scenario if present, else None
        known_scenarios = {
            "NORMAL_DAY",
            "HIGH_SOLAR",
            "EVENING_PEAK",
            "HIGH_SOLAR_LOW_LOAD",
            "EXTREME_INFEASIBLE",
            "STORM_CLOUD_RAMP",
            "EV_CHARGING_SURGE",
            "PHASE_UNBALANCE_PEAK",
            "NIGHT_QUIET",
        }
        normalized_name = input_data.scenarioName.upper().replace(" ", "_").replace("+", "")
        matched_scenario = None
        for s in known_scenarios:
            if s in normalized_name or normalized_name in s:
                matched_scenario = s
                break
        res.scenarioId = matched_scenario or input_data.scenarioName

        _ACTIVE_SIMULATION = res
        peak_time = res.summary.simulationTime or "13:15"
        _ACTIVE_POWER_FLOW = res.timeStepResults.get(peak_time, list(res.timeStepResults.values())[0])

        await self.repository.save_simulation(sim_id, res, status="COMPLETE")
        return res

    async def get_simulation(self, simulation_id: str) -> FullSimulationResult:
        global _ACTIVE_SIMULATION
        res = await self.repository.get_simulation(simulation_id)
        if not res:
            if _ACTIVE_SIMULATION:
                return _ACTIVE_SIMULATION
            raise ResourceNotFoundException("Simulation", simulation_id)
        return res

    async def run_single_power_flow(
        self,
        time: str,
        scenario_id: Optional[str] = None,
        grid_id: Optional[str] = None,
    ) -> PowerFlowResult:
        global _ACTIVE_SIMULATION, _ACTIVE_POWER_FLOW

        repo = NetworkRepository()
        target_grid_id = grid_id or await repo.get_active_grid_id()

        # 1. If active simulation has this exact time step already solved and matches grid, return it
        if (
            _ACTIVE_SIMULATION
            and (_ACTIVE_SIMULATION.input.gridId == target_grid_id or not _ACTIVE_SIMULATION.input.gridId)
            and time in _ACTIVE_SIMULATION.timeStepResults
        ):
            result = _ACTIVE_SIMULATION.timeStepResults[time]
            _ACTIVE_POWER_FLOW = result
            return result

        # 2. Get active input configuration or initialize default
        active_input = _ACTIVE_SIMULATION.input if _ACTIVE_SIMULATION else SimulationInput(gridId=target_grid_id)

        # 3. Calculate dynamic solar and load for the exact requested timestamp
        solar_kw, load_kw = interpolate_power_at_time(time, active_input)

        is_alt = active_input.networkConfig.feederTopology == "alternative"
        pf_engine = PowerFlowEngine(is_alternative_topology=is_alt)

        grid = await repo.get_grid(target_grid_id)
        if not grid:
            grid = await repo.get_network()

        buses, feeders, losses, tx_loading = pf_engine.solve(
            grid=grid,
            solar_kw=solar_kw,
            load_kw=load_kw,
            installed_solar_capacity_kw=active_input.installedSolarCapacityKw,
        )

        step_violations = ConstraintChecker.check_all(
            buses, feeders, time, active_input.networkConfig
        )

        pf_result = PowerFlowResult(
            timestamp=time,
            converged=True,
            iterations=4,
            buses=buses,
            feeders=feeders,
            violations=step_violations,
            totalLossKw=losses,
            totalGenerationKw=solar_kw,
            totalDemandKw=load_kw,
            batterySocPercent=active_input.batteryConfig.initialSocPercent,
        )

        # Cache dynamic result in active simulation timeStepResults and active power flow
        if _ACTIVE_SIMULATION:
            _ACTIVE_SIMULATION.timeStepResults[time] = pf_result
        _ACTIVE_POWER_FLOW = pf_result

        return pf_result
