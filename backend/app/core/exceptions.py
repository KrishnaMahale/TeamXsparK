from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class GridTwinException(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "BAD_REQUEST",
        message: str = "An error occurred during grid processing.",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": self.code,
                    "message": self.message,
                    "details": self.details,
                }
            }
        )


class ResourceNotFoundException(GridTwinException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' was not found.",
            details={"resource": resource, "identifier": str(identifier)},
        )


class ValidationException(GridTwinException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )


class PowerFlowException(GridTwinException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="POWER_FLOW_DIVERGENCE",
            message=message,
            details=details,
        )


class ActionInfeasibleException(GridTwinException):
    def __init__(self, reason: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ACTION_INFEASIBLE",
            message=reason,
            details=details,
        )
