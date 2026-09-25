from app.engine.battery import BatteryEngine
from app.schemas.battery import BatteryStorageConfig


def test_battery_healthy_discharge():
    config = BatteryStorageConfig(
        capacityKwh=100.0,
        initialSocPercent=62.0,
        maxChargeKw=40.0,
        maxDischargeKw=40.0,
    )
    b_engine = BatteryEngine(config)
    can_discharge, reason = b_engine.can_discharge(40.0, duration_hours=0.5)
    assert can_discharge is True
    assert reason == ""

    new_soc = b_engine.apply_dispatch(power_kw=40.0, duration_hours=0.5)
    assert new_soc < 62.0


def test_battery_depleted_infeasible_discharge():
    config = BatteryStorageConfig(
        capacityKwh=100.0,
        initialSocPercent=15.0, # Depleted below 20% safe floor
        maxChargeKw=40.0,
        maxDischargeKw=40.0,
    )
    b_engine = BatteryEngine(config)
    can_discharge, reason = b_engine.can_discharge(40.0, duration_hours=0.5)
    assert can_discharge is False
    assert "safe floor" in reason.lower() or "too low" in reason.lower()
