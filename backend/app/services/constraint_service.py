from typing import List
from app.schemas.network import Bus, Feeder
from app.schemas.violation import GridViolation, ViolationSummary
from app.schemas.simulation import NetworkLimitsConfig
from app.engine.constraints import ConstraintChecker


class ConstraintService:
    @staticmethod
    def evaluate_constraints(
        buses: List[Bus],
        feeders: List[Feeder],
        timestamp: str,
        config: NetworkLimitsConfig
    ) -> List[GridViolation]:
        return ConstraintChecker.check_all(buses, feeders, timestamp, config)

    @staticmethod
    def summarize_violations(violations: List[GridViolation]) -> ViolationSummary:
        total = len(violations)
        critical = len([v for v in violations if v.severity == "critical"])
        warning = len([v for v in violations if v.severity == "warning"])
        resolved = len([v for v in violations if v.severity == "resolved" or v.status == "resolved"])
        return ViolationSummary(
            total=total,
            critical=critical,
            warning=warning,
            resolved=resolved,
            hasViolations=(total > 0),
        )
