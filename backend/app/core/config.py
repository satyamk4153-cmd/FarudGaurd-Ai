import os
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the repository
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "FraudGuard AI"
    API_V1_STR: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Security & JWT
    JWT_SECRET_KEY: str = "fraudguard_super_secure_jwt_secret_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./fraudguard.db"

    # Redis & Distributed Worker
    REDIS_URL: str = "redis://localhost:6379/0"

    # Google Gemini AI Configuration (Grounded Analyst Assistant Layer)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Storage & ML Paths
    MODEL_DIRECTORY: str = str(BASE_DIR / "ml" / "artifacts")
    UPLOAD_DIRECTORY: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 50

    # Risk Engine Default Cutoffs
    LOW_RISK_MAX: float = 0.35
    MEDIUM_RISK_MAX: float = 0.70
    HIGH_RISK_MAX: float = 0.88
    # 0.88+ is CRITICAL

    # Risk Engine Weights
    WEIGHT_SUPERVISED: float = 0.55
    WEIGHT_ANOMALY: float = 0.25
    WEIGHT_RULE_VELOCITY: float = 0.20

    # Rate Limiting (Requests per minute)
    RATE_LIMIT_LOGIN_PER_MIN: int = 15
    RATE_LIMIT_PREDICT_PER_MIN: int = 120
    RATE_LIMIT_COPILOT_PER_MIN: int = 30
    RATE_LIMIT_BATCH_PER_MIN: int = 10

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("sqlite:///."):
            rel = v.replace("sqlite:///.", "").lstrip("/\\")
            abs_p = (BASE_DIR / rel).resolve().as_posix()
            return f"sqlite:///{abs_p}"
        return v

    @field_validator("MODEL_DIRECTORY", "UPLOAD_DIRECTORY", mode="before")
    @classmethod
    def normalize_directories(cls, v: str) -> str:
        if isinstance(v, str):
            p = Path(v)
            if not p.is_absolute():
                return str((BASE_DIR / p).resolve())
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip().startswith("[") and v.strip().endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def validate_production_security(self) -> None:
        """Validate production security posture. Fail fast if secrets are insecure."""
        if self.ENVIRONMENT.lower() == "production":
            self.DEBUG = False
            insecure_markers = ["change_in_production", "fraudguard_super_secure", "secret", "password"]
            if any(marker in self.JWT_SECRET_KEY.lower() for marker in insecure_markers) or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "FATAL SECURITY VIOLATION: In production mode (ENVIRONMENT=production), "
                    "JWT_SECRET_KEY must be a cryptographically strong secret of at least 32 characters. "
                    "Cannot use default or insecure secrets."
                )
            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "FATAL SECURITY VIOLATION: Wildcard '*' CORS origin is strictly forbidden in production."
                )

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env") if (BASE_DIR / ".env").exists() else str(BASE_DIR / ".env.example"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
settings.validate_production_security()

# Ensure critical directories exist
os.makedirs(settings.MODEL_DIRECTORY, exist_ok=True)
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
