from typing import List, Optional
from app.schemas.network import Bus, Feeder, Transformer
from app.schemas.violation import GridViolation, ViolationSeverity, ViolationType
from app.schemas.simulation import NetworkLimitsConfig


class ConstraintChecker:
    @staticmethod
    def check_voltage(
        buses: List[Bus],
        time_str: str,
        v_min: float = 0.95,
        v_max: float = 1.05
    ) -> List[GridViolation]:
        violations = []
        for bus in buses:
            if bus.voltage > v_max:
                violations.append(
                    GridViolation(
                        id=f"VIO-{bus.id}-OV-{time_str}",
                        time=time_str,
                        componentType="bus",
                        componentId=bus.id,
                        componentName=bus.name,
                        issue="Over-voltage",
                        type=ViolationType.OVER_VOLTAGE,
                        value=bus.voltage,
                        unit="pu",
                        formattedValue=f"{bus.voltage:.3f} pu",
                        limit=v_max,
                        formattedLimit=f"{v_max:.3f} pu",
                        severity=ViolationSeverity.CRITICAL,
                        status="active",
                        recommendationHint="Execute feeder reconfiguration or dispatch BESS discharge / limited curtailment",
                    )
                )
            elif bus.voltage < v_min:
                violations.append(
                    GridViolation(
                        id=f"VIO-{bus.id}-UV-{time_str}",
                        time=time_str,
                        componentType="bus",
                        componentId=bus.id,
                        componentName=bus.name,
                        issue="Under-voltage",
                        type=ViolationType.UNDER_VOLTAGE,
                        value=bus.voltage,
                        unit="pu",
                        formattedValue=f"{bus.voltage:.3f} pu",
                        limit=v_min,
                        formattedLimit=f"{v_min:.3f} pu",
                        severity=ViolationSeverity.WARNING,
                        status="active",
                        recommendationHint="Switch capacitor bank or inject battery active power",
                    )
                )
        return violations

    @staticmethod
    def check_feeder_loading(
        feeders: List[Feeder],
        time_str: str,
        feeder_max_pct: float = 100.0
    ) -> List[GridViolation]:
        violations = []
        for feeder in feeders:
            if feeder.loadingPercent > feeder_max_pct:
                violations.append(
                    GridViolation(
                        id=f"VIO-{feeder.id}-{time_str}",
                        time=time_str,
                        componentType="feeder",
                        componentId=feeder.id,
                        componentName=feeder.name,
                        issue="Overloaded",
                        type=ViolationType.FEEDER_OVERLOAD,
                        value=feeder.loadingPercent,
                        unit="%",
                        formattedValue=f"{feeder.loadingPercent:.0f}%",
                        limit=feeder_max_pct,
                        formattedLimit=f"{feeder_max_pct:.0f}%",
                        severity=ViolationSeverity.CRITICAL,
                        status="active",
                        recommendationHint=f"Shift branch load from {feeder.name} via tie-switch or dispatch local BESS",
                    )
                )
        return violations

    @staticmethod
    def check_transformer_loading(
        transformer: Optional[Transformer],
        tx_loading_pct: float,
        time_str: str,
        tx_max_pct: float = 100.0,
        tx_flow_kva: Optional[float] = None,
    ) -> List[GridViolation]:
        violations = []
        if not transformer:
            return violations
        if tx_loading_pct > tx_max_pct:
            flow_info = f" ({tx_flow_kva:.1f} kVA flow)" if tx_flow_kva is not None else ""
            hint = (
                f"Substation transformer {transformer.name} (Rated: {transformer.ratingKva:.0f} kVA) is overloaded at {tx_loading_pct:.1f}%"
                f"{flow_info}. Dispatch BESS storage or reconfigure feeder branches."
            )
            violations.append(
                GridViolation(
                    id=f"VIO-{transformer.id}-{time_str}",
                    time=time_str,
                    componentType="transformer",
                    componentId=transformer.id,
                    componentName=transformer.name,
                    issue="Overloaded",
                    type=ViolationType.TRANSFORMER_OVERLOAD,
                    value=round(tx_loading_pct, 1),
                    unit="%",
                    formattedValue=f"{tx_loading_pct:.1f}%",
                    limit=tx_max_pct,
                    formattedLimit=f"{tx_max_pct:.0f}%",
                    severity=ViolationSeverity.CRITICAL,
                    status="active",
                    recommendationHint=hint,
                )
            )
        return violations

    @staticmethod
    def check_all(
        buses: List[Bus],
        feeders: List[Feeder],
        time_str: str,
        config: NetworkLimitsConfig,
        transformer: Optional[Transformer] = None,
        tx_loading_pct: Optional[float] = None,
        tx_flow_kva: Optional[float] = None,
    ) -> List[GridViolation]:
        v_violations = ConstraintChecker.check_voltage(
            buses, time_str, config.voltageMinPu, config.voltageMaxPu
        )
        f_violations = ConstraintChecker.check_feeder_loading(
            feeders, time_str, config.feederLoadingLimitPercent
        )
        tx_violations = []
        if transformer is not None and tx_loading_pct is not None:
            limit = getattr(config, "transformerLoadingLimitPercent", 100.0)
            tx_violations = ConstraintChecker.check_transformer_loading(
                transformer, tx_loading_pct, time_str, limit, tx_flow_kva=tx_flow_kva
            )
        return v_violations + f_violations + tx_violations
