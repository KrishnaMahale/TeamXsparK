"""Step 4D — Model Registry for Persisted Forecasting Models.

Loads and caches the Step 4C trained and persisted model artifacts:
- solar_ghi_model.joblib
- temperature_model.joblib
- load_profile_model.joblib
- model_metadata.json
- model_benchmark_report.json

Provides fast in-memory access and raises clear exceptions if artifacts are missing.
Does NOT retrain models at runtime.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
import joblib

from app.core.logging import logger

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"


class ModelArtifactNotFoundError(FileNotFoundError):
    """Raised when a required Step 4C model artifact cannot be found."""
    pass


class ModelRegistry:
    """In-memory cache and access provider for persisted ML forecasting models."""

    _instance: Optional["ModelRegistry"] = None

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = models_dir or MODELS_DIR
        self._solar_model = None
        self._temperature_model = None
        self._load_model = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._benchmark_report: Optional[Dict[str, Any]] = None
        self._load_models()

    @classmethod
    def get_instance(cls, models_dir: Optional[Path] = None) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = cls(models_dir=models_dir)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset the singleton instance (useful for testing error conditions)."""
        cls._instance = None

    def _load_models(self) -> None:
        """Loads and caches all model artifacts into memory."""
        solar_path = self.models_dir / "solar_ghi_model.joblib"
        temp_path = self.models_dir / "temperature_model.joblib"
        load_path = self.models_dir / "load_profile_model.joblib"
        meta_path = self.models_dir / "model_metadata.json"
        rep_path = self.models_dir / "model_benchmark_report.json"

        # Strict validation: All artifacts must exist
        for path, name in [
            (solar_path, "solar_ghi_model.joblib"),
            (temp_path, "temperature_model.joblib"),
            (load_path, "load_profile_model.joblib"),
            (meta_path, "model_metadata.json"),
            (rep_path, "model_benchmark_report.json"),
        ]:
            if not path.exists():
                logger.error(f"[ModelRegistry] Required model artifact missing: {path}")
                raise ModelArtifactNotFoundError(
                    f"Model artifact '{name}' not found at {path}. Run Step 4C training first."
                )

        try:
            logger.info(f"[ModelRegistry] Loading persisted model artifacts from {self.models_dir}...")
            self._solar_model = joblib.load(solar_path)
            self._temperature_model = joblib.load(temp_path)
            self._load_model = joblib.load(load_path)

            with open(meta_path, "r", encoding="utf-8") as f:
                self._metadata = json.load(f)

            with open(rep_path, "r", encoding="utf-8") as f:
                self._benchmark_report = json.load(f)

            logger.info("[ModelRegistry] All forecasting models and metadata cached successfully.")
        except Exception as e:
            logger.error(f"[ModelRegistry] Failed to deserialize model artifacts: {e}")
            raise RuntimeError(f"Failed to load persisted ML models: {e}") from e

    def get_solar_model(self):
        if self._solar_model is None:
            self._load_models()
        return self._solar_model

    def get_temperature_model(self):
        if self._temperature_model is None:
            self._load_models()
        return self._temperature_model

    def get_load_model(self):
        if self._load_model is None:
            self._load_models()
        return self._load_model

    def get_metadata(self) -> Dict[str, Any]:
        if self._metadata is None:
            self._load_models()
        return self._metadata or {}

    def get_benchmark_report(self) -> Dict[str, Any]:
        if self._benchmark_report is None:
            self._load_models()
        return self._benchmark_report or {}

    def get_model_versions(self) -> Dict[str, str]:
        """Returns provenance and version descriptor for logging and response metadata."""
        meta = self.get_metadata()
        return {
            "solar_model": meta.get("solar_ghi_model", {}).get("model_type", "HistGradientBoostingRegressor"),
            "temperature_model": meta.get("temperature_model", {}).get("model_type", "Ridge_Regression_Pipeline"),
            "load_model": meta.get("load_profile_model", {}).get("model_type", "HistGradientBoostingRegressor_Pipeline"),
            "solar_training_timestamp": meta.get("solar_ghi_model", {}).get("training_timestamp", "unknown"),
            "temperature_training_timestamp": meta.get("temperature_model", {}).get("training_timestamp", "unknown"),
            "load_training_timestamp": meta.get("load_profile_model", {}).get("training_timestamp", "unknown"),
        }


def get_model_registry() -> ModelRegistry:
    return ModelRegistry.get_instance()
