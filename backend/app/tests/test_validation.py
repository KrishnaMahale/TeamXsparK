import pytest
from pydantic import ValidationError
from app.schemas.simulation import SimulationInput, NetworkLimitsConfig, BatteryStorageConfig, TimeSeriesSolarPoint
from app.services.simulation_service import SimulationService
from app.core.exceptions import ValidationException


def test_valid_simulation_input():
    config = SimulationInput(
        scenarioName="Valid Test",
        installedSolarCapacityKw=250.0,
        currentSolarKw=200.0,
        peakLoadKw=180.0,
        currentLoadKw=120.0,
    )
    assert config.scenarioName == "Valid Test"
    assert config.installedSolarCapacityKw == 250.0


def test_reject_negative_solar_timeseries():
    with pytest.raises(ValidationError):
        TimeSeriesSolarPoint(id="s1", time="12:00", solarKw=-10.0)


def test_reject_invalid_voltage_limits():
    service = SimulationService()
    sim_input = SimulationInput(
        networkConfig=NetworkLimitsConfig(voltageMinPu=1.06, voltageMaxPu=1.05)
    )
    with pytest.raises(ValidationException):
        import asyncio
        asyncio.run(service.run_simulation(sim_input))


def test_reject_invalid_battery_soc():
    with pytest.raises(ValidationError):
        BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=120.0)
    with pytest.raises(ValidationError):
        BatteryStorageConfig(capacityKwh=100.0, initialSocPercent=-5.0)
