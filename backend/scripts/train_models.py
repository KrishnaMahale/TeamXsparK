import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.ml.solar_forecaster import SolarForecaster
from app.ml.load_forecaster import LoadForecaster
from app.ml.preprocessing import generate_synthetic_training_data


def train():
    setup_logging()
    logger.info("Starting baseline ML model training (Random Forest Regressors)...")

    # Generate synthetic training dataset
    df_train = generate_synthetic_training_data(days=21, installed_solar_capacity_kw=250.0)
    logger.info(f"Generated {len(df_train)} synthetic training records.")

    # 1. Train Solar Forecaster
    solar_fc = SolarForecaster()
    s_metrics = solar_fc.train(df_train)
    solar_path = os.path.join(settings.MODEL_PATH, "solar_rf.joblib")
    solar_fc.save(solar_path)
    logger.info(f"Solar Model Metrics: {s_metrics}")

    # 2. Train Load Forecaster
    load_fc = LoadForecaster()
    l_metrics = load_fc.train(df_train)
    load_path = os.path.join(settings.MODEL_PATH, "load_rf.joblib")
    load_fc.save(load_path)
    logger.info(f"Load Model Metrics: {l_metrics}")

    logger.info("Model training completed successfully!")


if __name__ == "__main__":
    train()
