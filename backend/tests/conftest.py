import pytest
from backend.app.core.config import settings
from backend.app.db.session import SessionLocal, engine, Base
from backend.app.db.init_db import init_db
from scripts.seed_database import seed_users
from ml.inference.engine import InferenceEngine

@pytest.fixture(scope="session", autouse=True)
def initialize_test_environment():
    """Ensure database schema is created, demo users seeded, and ML models loaded."""
    db = SessionLocal()
    try:
        init_db(db)
        seed_users()
    finally:
        db.close()

    # Pre-warm ML engine
    engine_inst = InferenceEngine.get_instance()
    yield
