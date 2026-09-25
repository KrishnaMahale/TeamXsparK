import pytest
from app.ml.preprocessing import generate_synthetic_training_data
from app.ml.solar_forecaster import SolarForecaster
from app.ml.load_forecaster import LoadForecaster
from app.ml.model_manager import get_model_manager


def test_model_training():
    df = generate_synthetic_training_data(days=3, installed_solar_capacity_kw=250.0)
    solar_fc = SolarForecaster()
    s_metrics = solar_fc.train(df)
    assert "r2" in s_metrics
    assert s_metrics["r2"] > 0.70

    load_fc = LoadForecaster()
    l_metrics = load_fc.train(df)
    assert "r2" in l_metrics
    assert l_metrics["r2"] > 0.70


def test_forecast_manager_24h():
    manager = get_model_manager()
    fc = manager.generate_24h_forecast(24)
    assert len(fc.dataPoints) == 24
    assert fc.metrics.peakSolarKw > 0
    assert fc.metrics.peakLoadKw > 0
    assert fc.metrics.solarAccuracyPercent > 50.0
