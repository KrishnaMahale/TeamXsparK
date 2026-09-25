import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "TeamXsparK Renewable Distribution Grid Digital Twin"
    API_PREFIX: str = "/api"
    VERSION: str = "1.0.0"

    # Supabase / DB Configuration
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(default="", env="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", env="SUPABASE_SERVICE_ROLE_KEY")
    DATABASE_URL: str = Field(default="", env="DATABASE_URL")

    # CORS
    CORS_ORIGINS_RAW: str = Field(default="http://localhost:5173,http://127.0.0.1:5173", env="CORS_ORIGINS")

    # Machine Learning
    MODEL_PATH: str = Field(default="./data/models", env="MODEL_PATH")

    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.CORS_ORIGINS_RAW:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]


settings = Settings()
