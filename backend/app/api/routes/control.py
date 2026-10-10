"""
Sequential Multi-Step Controller API Routes.
Exposes POST /api/control/sequential/plan for receding-horizon MPC trajectory optimization.
"""

from fastapi import APIRouter, Depends, status
from app.schemas.sequential_control import (
    SequentialControlRequest,
    SequentialControlResponse,
)
from app.services.sequential_control_service import SequentialControlService

router = APIRouter(prefix="/control", tags=["Control"])


def get_sequential_control_service() -> SequentialControlService:
    return SequentialControlService()


@router.post(
    "/sequential/plan",
    response_model=SequentialControlResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute Physically-Verified Sequential Trajectory Plan",
    description=(
        "Executes receding-horizon MPC optimization over H >= 8 consecutive 15-minute intervals. "
        "Evaluates stateful battery SOC propagation, network limit constraints, and alternative topology "
        "reconfiguration with authoritative physical AC power-flow verification."
    ),
)
async def plan_sequential_control(
    request: SequentialControlRequest,
    service: SequentialControlService = Depends(get_sequential_control_service),
) -> SequentialControlResponse:
    """
    Computes an optimal, verified multi-step corrective trajectory plan.
    Returns FEASIBLE when all constraints are verified compliant across the entire horizon,
    or INFEASIBLE with detailed violation diagnostics if network congestion cannot be fully alleviated.
    """
    return await service.plan_sequential_control(request)
