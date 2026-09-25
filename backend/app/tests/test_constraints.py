from app.engine.power_flow import PowerFlowEngine
from app.engine.constraints import ConstraintChecker
from app.schemas.simulation import NetworkLimitsConfig


def test_over_voltage_and_overload_detection():
    engine = PowerFlowEngine(is_alternative_topology=False)
    buses, feeders, _, _ = engine.solve(solar_kw=240.0, load_kw=120.0)

    config = NetworkLimitsConfig(
        voltageMinPu=0.95,
        voltageMaxPu=1.05,
        feederLoadingLimitPercent=100.0,
    )

    violations = ConstraintChecker.check_all(buses, feeders, "13:15", config)
    assert len(violations) >= 2

    ov_violation = next(v for v in violations if v.type == "over_voltage")
    assert ov_violation.componentId == "B3"
    assert ov_violation.value > 1.05

    ol_violation = next(v for v in violations if v.type == "feeder_overload")
    assert ol_violation.componentId == "F-02"
    assert ol_violation.value > 100.0
