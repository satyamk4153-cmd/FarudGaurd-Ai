import argparse
import os
import sys
from pathlib import Path
import pandas as pd

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml.preprocessing.generator import FinancialDataGenerator

def main():
    parser = argparse.ArgumentParser(description="FraudGuard AI Synthetic Financial Transaction Generator")
    parser.add_argument("--rows", type=int, default=15000, help="Number of transaction rows to generate (default: 15,000)")
    parser.add_argument("--fraud-rate", type=float, default=0.035, help="Fraud rate between 0.0 and 1.0 (default: 0.035 = 3.5%)")
    parser.add_argument("--customers", type=int, default=1200, help="Number of simulated customers")
    parser.add_argument("--merchants", type=int, default=200, help="Number of simulated merchants")
    parser.add_argument("--devices", type=int, default=2000, help="Number of simulated devices")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed")
    parser.add_argument("--output", type=str, default="ml/datasets/synthetic_transactions.csv", help="Output CSV path")
    parser.add_argument("--seed-db", action="store_true", help="Also populate generated records directly into database")
    
    args = parser.parse_args()

    print(f"--- FraudGuard AI Synthetic Generator ---")
    print(f"Generating {args.rows} transactions with fraud rate {args.fraud_rate:.2%} (seed: {args.seed})...")
    
    generator = FinancialDataGenerator(
        num_customers=args.customers,
        num_merchants=args.merchants,
        num_devices=args.devices,
        seed=args.seed,
    )
    
    df = generator.generate_transactions(
        num_rows=args.rows,
        fraud_rate=args.fraud_rate,
    )
    
    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = BASE_DIR / out_path
    os.makedirs(out_path.parent, exist_ok=True)
    
    df.to_csv(out_path, index=False)
    print(f"Saved dataset to {out_path} ({len(df)} rows, {len(df.columns)} columns)")
    print(f"Legitimate count: {(df['is_fraud'] == 0).sum()} | Fraud count: {(df['is_fraud'] == 1).sum()}")
    print("Fraud distribution by pattern:")
    print(df[df['is_fraud'] == 1]['fraud_pattern'].value_counts())

    if args.seed_db:
        from backend.app.db.session import SessionLocal
        from backend.app.models.transaction import Transaction
        from backend.app.models.ml_models import Dataset, DatasetVersion
        from datetime import timezone
        import json

        print("\nSeeding transactions into database...")
        db = SessionLocal()
        
        # Register dataset in DB catalog
        existing_ds = db.query(Dataset).filter(Dataset.name == "Synthetic Baseline 15k").first()
        if not existing_ds:
            ds = Dataset(
                name="Synthetic Baseline 15k",
                source="SYNTHETIC",
                description="Deterministic synthetic financial transaction benchmark dataset with 7 fraud topologies",
                filename=str(out_path.name),
                row_count=len(df),
                column_count=len(df.columns),
                fraud_count=int((df['is_fraud'] == 1).sum()),
                legitimate_count=int((df['is_fraud'] == 0).sum()),
                feature_summary_json=json.dumps({"fraud_rate": float(args.fraud_rate), "seed": args.seed}),
                status="READY",
            )
            db.add(ds)
            db.commit()
            db.refresh(ds)
            
            ds_ver = DatasetVersion(
                dataset_id=ds.id,
                version="v1.0",
                row_count=len(df),
                file_path=str(out_path),
            )
            db.add(ds_ver)
            db.commit()

        # Batch insert into transactions table (e.g. first 2000 for quick demonstration)
        seed_limit = min(3000, len(df))
        existing_txns = db.query(Transaction).count()
        if existing_txns < seed_limit:
            print(f"Inserting {seed_limit} transaction records into database...")
            txns_to_add = []
            for _, row in df.iloc[:seed_limit].iterrows():
                txns_to_add.append(
                    Transaction(
                        external_transaction_id=row["external_transaction_id"],
                        customer_id=row["customer_id"],
                        card_id=row["card_id"],
                        amount=float(row["amount"]),
                        currency=row["currency"],
                        transaction_type=row["transaction_type"],
                        merchant_id=row["merchant_id"],
                        merchant_category=row["merchant_category"],
                        location=row["location"],
                        country=row["country"],
                        device_id=row["device_id"],
                        ip_address=row["ip_address"],
                        channel=row["channel"],
                        timestamp=pd.to_datetime(row["timestamp"]).to_pydatetime(),
                        account_age_days=int(row["account_age_days"]),
                        transaction_frequency=int(row["transaction_frequency"]),
                        previous_transaction_amount=float(row["previous_transaction_amount"]),
                        balance_before=float(row["balance_before"]),
                        balance_after=float(row["balance_after"]),
                        distance_from_previous_transaction=float(row["distance_from_previous_transaction"]),
                        ip_risk=float(row["ip_risk"]),
                        device_risk=float(row["device_risk"]),
                        is_fraud=bool(row["is_fraud"]),
                        extra_metadata=json.dumps({"fraud_pattern": row["fraud_pattern"]}),
                    )
                )
            db.bulk_save_objects(txns_to_add)
            db.commit()
            print(f"Successfully seeded {len(txns_to_add)} transactions into database.")
        else:
            print(f"Database already contains {existing_txns} transactions.")
        db.close()

if __name__ == "__main__":
    main()
