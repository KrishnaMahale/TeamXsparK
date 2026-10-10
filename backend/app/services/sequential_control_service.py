"""
Step 4C — Sequential Control Service for Renewable Distribution Grid Digital Twin.
Coordinates grid resolution, forecast series validation, state initialization,
and bounded receding-horizon MPC trajectory planning via SequentialController.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional

from app.core.exceptions import (
    PowerFlowException,
    ResourceNotFoundException,
    ValidationException,
)
from app.core.logging import logger
from app.db.repositories.network_repository import NetworkRepository
from app.engine.sequential_controller import SequentialController, SequentialState
from app.schemas.sequential_control import (
    PlanStatus,
    SequentialControlRequest,
    SequentialControlResponse,
    SequentialForecastPoint,
)
from app.services.forecast_service import ForecastService


class SequentialControlService:
    """
    Application service managing receding-horizon sequential control planning.
    Ensures state isolation, strict validation, and authoritative physical verification.
    """

    def __init__(
        self,
        network_repo: Optional[NetworkRepository] = None,
        forecast_service: Optional[ForecastService] = None,
    ):
        self.network_repo = network_repo or NetworkRepository()
        self.forecast_service = forecast_service or ForecastService()

    def validate_forecast_points(
        self,
        points: List[SequentialForecastPoint],
        start_time: str,
        horizon_steps: int,
    ) -> None:
        """
        Validates numeric finiteness, non-negativity, timestamps, and step spacing.
        Raises ValidationException if invalid.
        """
        if not points:
            raise ValidationException("Forecast series cannot be empty.")

        if horizon_steps < 8:
            raise ValidationException(f"Planning horizon must be at least 8 timesteps (got {horizon_steps}).")

        # Validate numeric bounds on all provided points
        for idx, pt in enumerate(points):
            if not pt.time or not isinstance(pt.time, str) or ":" not in pt.time:
                raise ValidationException(
                    f"Forecast point at index {idx} has invalid timestamp: '{pt.time}'."
                )

            if math.isnan(pt.solarKw) or math.isinf(pt.solarKw) or pt.solarKw < 0.0:
                raise ValidationException(
                    f"Forecast point at index {idx} ({pt.time}) has invalid solarKw: {pt.solarKw}. "
                    "Must be finite and non-negative."
                )

            if math.isnan(pt.loadKw) or math.isinf(pt.loadKw) or pt.loadKw < 0.0:
                raise ValidationException(
                    f"Forecast point at index {idx} ({pt.time}) has invalid loadKw: {pt.loadKw}. "
                    "Must be finite and non-negative."
                )

    async def plan_sequential_control(
        self,
        request: SequentialControlRequest,
    ) -> SequentialControlResponse:
        """
        Executes bounded receding-horizon trajectory optimization.
        Guarantees physical power-flow verification and returns explicit feasibility diagnostics.
        """
        # 1. Resolve Grid
        grid = await self.network_repo.get_grid(request.gridId)
        if not grid:
            raise ResourceNotFoundException("Grid", request.gridId)

        # 2. Validate Horizon
        if request.horizonSteps < 8:
            raise ValidationException(
                f"Planning horizon must be at least 8 timesteps (got {request.horizonSteps})."
            )

        # 3. Validate Topology Configuration
        init_topo = getattr(request, "initialTopology", "standard") or "standard"
        if init_topo not in ("standard", "alternative"):
            raise ValidationException(
                f"Invalid initial topology '{init_topo}'. Must be 'standard' or 'alternative'."
            )

        supports_alternative = any(
            getattr(f, "isReconfigurableAlternate", False) for f in grid.feeders
        )
        if init_topo == "alternative" and not supports_alternative:
            raise ValidationException(
                f"Grid '{grid.id}' does not support alternative topology reconfiguration."
            )

        # 4. Validate Battery SOC overrides if provided
        if request.initialSocPercent is not None:
            if (
                math.isnan(request.initialSocPercent)
                or math.isinf(request.initialSocPercent)
                or request.initialSocPercent < 0.0
                or request.initialSocPercent > 100.0
            ):
                raise ValidationException(
                    f"Initial SOC percentage {request.initialSocPercent}% is invalid. Must be between 0 and 100."
                )

        if request.batterySocs:
            for b_id, soc in request.batterySocs.items():
                if math.isnan(soc) or math.isinf(soc) or soc < 0.0 or soc > 100.0:
                    raise ValidationException(
                        f"Initial SOC for battery '{b_id}' ({soc}%) is invalid. Must be between 0 and 100."
                    )

        # 5. Resolve Forecast Data
        effective_forecast = request.forecastData
        if not effective_forecast:
            # Reuse real day-ahead forecast from ForecastService without fabricating data
            try:
                fc_res = await self.forecast_service.get_timeseries_forecast(
                    grid_id=grid.id,
                    horizon_hours=24,
                )
                effective_forecast = [
                    SequentialForecastPoint(
                        time=pt.time,
                        solarKw=float(pt.solar),
                        loadKw=float(pt.load),
                    )
                    for pt in fc_res.points
                ]
            except Exception as e:
                raise ValidationException(
                    f"Failed to retrieve day-ahead forecast for grid '{grid.id}': {e}"
                )

        # Validate numeric and chronological properties
        self.validate_forecast_points(
            effective_forecast,
            start_time=request.startTimestep,
            horizon_steps=request.horizonSteps,
        )

        effective_request = request.model_copy(
            update={
                "forecastData": effective_forecast,
                "initialTopology": init_topo,
            }
        )

        # 6. Instantiate isolated controller (ensures zero shared mutable state across requests)
        controller = SequentialController(
            grid=grid,
            step_duration_hours=request.stepDurationHours,
        )

        # Validate forecast series windowing and 15-minute spacing
        try:
            controller.validate_forecast_series(
                forecast_points=effective_forecast,
                start_time=request.startTimestep,
                horizon_steps=request.horizonSteps,
            )
        except ValueError as e:
            raise ValidationException(f"Forecast validation failed: {e}")

        # 7. Execute receding-horizon planning
        try:
            response = controller.plan(effective_request)
        except Exception as e:
            logger.error(f"[SequentialControlService] Controller execution failed for grid '{grid.id}': {e}")
            raise PowerFlowException(
                f"Physical power flow solver encountered an error during sequential planning: {e}"
            )

        # Handle forecast validation errors returned internally by controller
        if response.status == PlanStatus.ERROR and response.fallbackReason:
            if "Forecast validation error" in response.fallbackReason:
                raise ValidationException(response.fallbackReason)

        return response

    async def replan_sequential_control(
        self,
        grid_id: str,
        current_state: SequentialState,
        updated_forecast: List[SequentialForecastPoint],
        horizon_steps: int = 8,
    ) -> SequentialControlResponse:
        """
        Executes receding-horizon replanning from an observed state.
        """
        grid = await self.network_repo.get_grid(grid_id)
        if not grid:
            raise ResourceNotFoundException("Grid", grid_id)

        # Validate observed battery SOCs
        if current_state.battery_socs:
            for b_id, soc in current_state.battery_socs.items():
                if math.isnan(soc) or math.isinf(soc) or soc < 0.0 or soc > 100.0:
                    raise ValidationException(
                        f"Observed SOC for battery '{b_id}' ({soc}%) is invalid. Must be between 0 and 100."
                    )

        # Validate observed topology state
        if current_state.topology_state not in ("standard", "alternative"):
            raise ValidationException(
                f"Observed topology state '{current_state.topology_state}' is invalid. Must be 'standard' or 'alternative'."
            )

        supports_alternative = any(
            getattr(f, "isReconfigurableAlternate", False) for f in grid.feeders
        )
        if current_state.topology_state == "alternative" and not supports_alternative:
            raise ValidationException(
                f"Grid '{grid.id}' does not support alternative topology reconfiguration."
            )

        self.validate_forecast_points(
            updated_forecast,
            start_time=current_state.time,
            horizon_steps=horizon_steps,
        )

        controller = SequentialController(grid=grid)
        return controller.replan(
            current_state=current_state,
            updated_forecast=updated_forecast,
            horizon_steps=horizon_steps,
        )
