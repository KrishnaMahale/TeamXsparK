import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from app.ml.feature_engineering import FeatureEngineer
from app.core.logging import logger


class SolarForecaster:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
        self.is_trained = False
        self.features = ["hour", "minute", "hour_sin", "hour_cos"]

    def train(self, df: pd.DataFrame) -> Dict[str, float]:
        df_feat = FeatureEngineer.extract_time_features(df, "time")
        X = df_feat[self.features]
        y = df_feat["solar_kw"]

        self.model.fit(X, y)
        self.is_trained = True

        y_pred = self.model.predict(X)
        mae = float(mean_absolute_error(y, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
        r2 = float(r2_score(y, y_pred))

        logger.info(f"SolarForecaster trained: MAE={mae:.2f}, RMSE={rmse:.2f}, R2={r2:.2f}")
        return {"mae": round(mae, 2), "rmse": round(rmse, 2), "r2": round(r2, 2)}

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model is not trained.")
        df_feat = FeatureEngineer.extract_time_features(df, "time")
        X = df_feat[self.features]
        preds = self.model.predict(X)
        return np.maximum(0.0, preds)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        logger.info(f"Saved solar model to {filepath}")

    def load(self, filepath: str):
        if os.path.exists(filepath):
            self.model = joblib.load(filepath)
            self.is_trained = True
            logger.info(f"Loaded solar model from {filepath}")
        else:
            logger.warning(f"Model file not found at {filepath}")
