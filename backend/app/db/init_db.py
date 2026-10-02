import logging
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base
import backend.app.models as models

logger = logging.getLogger(__name__)

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

if __name__ == "__main__":
    from backend.app.db.session import SessionLocal
    db = SessionLocal()
    init_db(db)
    db.close()
    print("Database tables and catalogs initialized successfully.")
