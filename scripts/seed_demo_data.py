#!/usr/bin/env python3
"""
Explicit Demo Data Seeder for FraudGuard AI.
Populates standard demonstration users, feature metadata, champion model registry,
and generates/scores realistic transactions using the genuine ML inference engine.
"""
import sys
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.db.session import SessionLocal
from backend.app.db.init_db import init_db
from scripts.seed_database import seed_users
from scripts.score_seeded_transactions import score_transactions
from backend.app.models.transaction import Transaction
from ml.preprocessing.generator import FinancialDataGenerator

def seed_demo_data():
    print("=" * 60)
    print("FraudGuard AI — Explicit Demo Data Seeder")
    print("=" * 60)
    
    # 1. Initialize schema & base metadata
    print("\n[Step 1/4] Ensuring database schema and base feature catalog...")
    db = SessionLocal()
    init_db(db)
    
    # 2. Seed default users
    print("\n[Step 2/4] Seeding demo users...")
    seed_users()
    
    # 3. Check transaction count; seed synthetic dataset if needed
    print("\n[Step 3/4] Checking transaction ledger records...")
    tx_count = db.query(Transaction).count()
    if tx_count < 200:
        print(f"Ledger contains only {tx_count} records. Generating 2,500 synthetic transactions...")
        generator = FinancialDataGenerator(num_customers=500, num_merchants=100, num_devices=800, seed=42)
        df = generator.generate_transactions(num_rows=2500, fraud_rate=0.04)
        
        # Save to disk
        out_path = BASE_DIR / "ml" / "datasets" / "synthetic_transactions.csv"
        os.makedirs(out_path.parent, exist_ok=True)
        df.to_csv(out_path, index=False)
        print(f"Saved synthetic transactions to {out_path}")
        
        # Ingest into DB
        print("Ingesting transactions into database...")
        for _, row in df.iterrows():
            from datetime import datetime, timezone
            try:
                ts = datetime.fromisoformat(str(row["timestamp"]))
            except Exception:
                ts = datetime.now(timezone.utc)
                
            t = Transaction(
                external_transaction_id=str(row["external_transaction_id"]),
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
            db.add(t)
        db.commit()
        print(f"Successfully ingested 2,500 transactions into ledger.")
    else:
        print(f"Ledger already populated with {tx_count} records.")

    db.close()

    # 4. Score unscored transactions with real ML inference engine
    print("\n[Step 4/4] Scoring transactions with genuine InferenceEngine...")
    score_transactions()

    print("\n" + "=" * 60)
    print("SUCCESS: Demo data seeding complete. System ready for demonstration.")
    print("=" * 60)

if __name__ == "__main__":
    seed_demo_data()
