import pytest
from backend.app.core.config import settings
from backend.app.db.session import SessionLocal, engine, Base
from backend.app.db.init_db import init_db
from scripts.seed_database import seed_users
from ml.inference.engine import InferenceEngine


@pytest.fixture(scope="session", autouse=True)
def initialize_test_environment():
    """Ensure database schema, demo users, ML models, and synthetic transactions
    are all available before any test runs.

    The test DATABASE_URL (set via the ENVIRONMENT variable in CI) points to a
    fresh SQLite file.  We generate exactly 3 000 synthetic transactions so that
    assertions such as ``total_transactions >= 3000`` remain deterministic and
    environment-independent.
    """
    db = SessionLocal()
    try:
        # 1. Create schema + seed feature catalog + seed champion ModelVersion
        init_db(db)
        # 2. Seed demo users (admin / analyst / user)
        seed_users()
        # 3. Seed synthetic transactions if the ledger is too small
        from backend.app.models.transaction import Transaction
        tx_count = db.query(Transaction).count()
        if tx_count < 3000:
            _seed_transactions(db, target=3000 - tx_count)
    finally:
        db.close()

    # 4. Pre-warm ML engine (singleton – reused across all tests)
    InferenceEngine.get_instance()
    yield


def _seed_transactions(db, target: int = 3000) -> None:
    """Generate *target* synthetic transactions using FinancialDataGenerator.

    Uses a time-based ID offset to avoid UNIQUE constraint violations when
    transactions already exist in the database (e.g. the local development DB).
    """
    import re
    from datetime import datetime, timezone
    from ml.preprocessing.generator import FinancialDataGenerator
    from backend.app.models.transaction import Transaction

    # Determine the highest existing external_transaction_id number so we can
    # generate non-colliding IDs for the newly-seeded records.
    existing_ids = db.query(Transaction.external_transaction_id).all()
    max_offset = 0
    for (eid,) in existing_ids:
        m = re.search(r"(\d+)$", str(eid))
        if m:
            max_offset = max(max_offset, int(m.group(1)))

    # Use a fresh seed so IDs don't clash; generate more rows than needed so we
    # can skip any that happen to collide.
    generator = FinancialDataGenerator(
        num_customers=500,
        num_merchants=100,
        num_devices=800,
        seed=99,          # different seed from the main demo (42) to get new IDs
    )
    df = generator.generate_transactions(num_rows=target, fraud_rate=0.04)

    inserted = 0
    for idx, (_, row) in enumerate(df.iterrows()):
        try:
            ts = datetime.fromisoformat(str(row["timestamp"]))
        except Exception:
            ts = datetime.now(timezone.utc)

        # Rewrite the external ID with the offset so it is guaranteed unique
        new_ext_id = f"TXN-{max_offset + idx + 1:07d}"

        txn = Transaction(
            external_transaction_id=new_ext_id,
            customer_id=str(row["customer_id"]),
            card_id=str(row.get("card_id", "CARD-DEFAULT")),
            amount=float(row["amount"]),
            currency=str(row.get("currency", "INR")),
            transaction_type=str(row["transaction_type"]),
            merchant_id=str(row["merchant_id"]),
            merchant_category=str(row["merchant_category"]),
            location=str(row.get("location", "Mumbai")),
            country=str(row.get("country", "IN")),
            device_id=str(row.get("device_id", "DEV-DEFAULT")),
            ip_address=str(row.get("ip_address", "127.0.0.1")),
            channel=str(row.get("channel", "ONLINE")),
            timestamp=ts,
            account_age_days=int(row.get("account_age_days", 30)),
            transaction_frequency=int(row.get("transaction_frequency", 1)),
            previous_transaction_amount=float(row.get("previous_transaction_amount", 0.0)),
            balance_before=float(row.get("balance_before", 0.0)),
            balance_after=float(row.get("balance_after", 0.0)),
            distance_from_previous_transaction=float(row.get("distance_from_previous_transaction", 0.0)),
            ip_risk=float(row.get("ip_risk", 0.05)),
            device_risk=float(row.get("device_risk", 0.05)),
        )
        db.add(txn)
        inserted += 1

    db.commit()
    print(f"[conftest] Seeded {inserted} synthetic transactions into test database.")

