import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base
import backend.app.models as models

logger = logging.getLogger(__name__)

# Project root  (backend/app/db/init_db.py → 4 levels up)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

INITIAL_FEATURES = [
    {"name": "amount", "data_type": "float", "category": "Transaction", "description": "Transaction currency amount", "is_derived": False, "importance_score": 0.28},
    {"name": "amount_to_avg_ratio", "data_type": "float", "category": "Velocity", "description": "Ratio of amount to customer 30-day average", "is_derived": True, "importance_score": 0.24},
    {"name": "transaction_frequency", "data_type": "int", "category": "Velocity", "description": "Velocity count in past 24 hours", "is_derived": False, "importance_score": 0.18},
    {"name": "distance_from_prev", "data_type": "float", "category": "Geographic", "description": "Kilometer distance from last known location", "is_derived": False, "importance_score": 0.12},
    {"name": "device_risk", "data_type": "float", "category": "Entity", "description": "Heuristic device fingerprint risk score", "is_derived": False, "importance_score": 0.08},
    {"name": "ip_risk", "data_type": "float", "category": "Entity", "description": "IP reputation risk index", "is_derived": False, "importance_score": 0.06},
    {"name": "account_age_days", "data_type": "int", "category": "Behavioral", "description": "Age of customer account in days", "is_derived": False, "importance_score": 0.04},
]


def run_migrations() -> None:
    """Run Alembic database migrations programmatically to head revision."""
    from backend.app.core.config import settings
    alembic_ini_path = Path(__file__).resolve().parent.parent.parent.parent / "alembic.ini"
    if not alembic_ini_path.exists():
        if settings.ENVIRONMENT == "production":
            raise RuntimeError(f"CRITICAL: alembic.ini not found at {alembic_ini_path}. Production migrations cannot proceed.")
        logger.warning(f"alembic.ini not found at {alembic_ini_path}")
        return

    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config(str(alembic_ini_path))
        command.upgrade(alembic_cfg, "head")
        logger.info("Successfully executed database schema migrations to head.")
    except Exception as e:
        if settings.ENVIRONMENT == "production":
            logger.critical(f"CRITICAL: Production migration failure: {e}")
            raise RuntimeError(f"Production migration failure: {e}") from e
        logger.warning(f"Alembic migration runner noticed: {e}. Falling back to metadata creation.")


def seed_champion_model_version(db: Session) -> None:
    """Seed the champion ModelVersion record from the on-disk model_registry.json manifest.

    This ensures the model_versions table is never empty so tools like
    ``get_model_information`` always return a complete schema (including the
    ``algorithm`` field) even on a freshly-initialised database (e.g. CI).
    """
    existing = db.query(models.ModelVersion).count()
    if existing > 0:
        logger.debug("ModelVersion rows already present – skipping champion seed.")
        return

    manifest_path = _PROJECT_ROOT / "ml" / "artifacts" / "model_registry.json"
    if not manifest_path.exists():
        logger.warning(
            f"model_registry.json not found at {manifest_path}. "
            "Skipping champion ModelVersion seed."
        )
        return

    try:
        with open(manifest_path, "r") as fh:
            manifest = json.load(fh)
        active = manifest.get("active_model", {})

        champion = models.ModelVersion(
            name=active.get("name", "FraudGuard XGBoost Champion"),
            algorithm=active.get("algorithm", "XGBoost"),
            version=active.get("version", "v1.0"),
            status=models.ModelStatus.ACTIVE,
            artifact_path=str(
                _PROJECT_ROOT / "ml" / "artifacts" / active.get("artifact_file", "xgboost_v1.joblib")
            ),
            threshold=float(active.get("threshold", 0.75)),
        )
        db.add(champion)
        db.commit()
        db.refresh(champion)
        logger.info(
            f"Seeded champion ModelVersion: {champion.name} "
            f"({champion.algorithm} {champion.version})"
        )
    except Exception as exc:
        logger.warning(f"Could not seed champion ModelVersion: {exc}")
        db.rollback()


def init_db(db: Session = None) -> None:
    """Create all tables and seed required initial metadata."""
    from backend.app.core.config import settings
    logger.info("Initializing database tables...")
    run_migrations()

    # In production, schema must be strictly managed by Alembic, never silent create_all
    if settings.ENVIRONMENT != "production":
        Base.metadata.create_all(bind=engine)

    if db:
        # Seed initial feature metadata if empty
        existing_features = db.query(models.FeatureMetadata).count()
        if existing_features == 0:
            for feat in INITIAL_FEATURES:
                meta = models.FeatureMetadata(
                    name=feat["name"],
                    data_type=feat["data_type"],
                    category=feat["category"],
                    description=feat["description"],
                    is_derived=feat["is_derived"],
                    importance_score=feat["importance_score"],
                )
                db.add(meta)
            db.commit()
            logger.info("Initialized feature metadata catalog.")

        # Seed champion model version record (needed for Copilot get_model_information)
        seed_champion_model_version(db)


if __name__ == "__main__":
    from backend.app.db.session import SessionLocal
    db = SessionLocal()
    init_db(db)
    db.close()
    print("Database tables and catalogs initialized successfully.")
