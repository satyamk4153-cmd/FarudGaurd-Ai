import pytest
import pandas as pd
from ml.preprocessing.validator import DatasetValidator
from ml.features.engineer import FeatureEngineer
from ml.features.schema import FEATURE_COLUMNS, RAW_REQUIRED_COLUMNS

def test_validator_detects_missing_columns():
    bad_df = pd.DataFrame([{"amount": 100.0, "location": "Mumbai"}])
    res = DatasetValidator.validate_dataset(bad_df)
    assert res["is_valid"] is False
    assert any("Missing required columns" in err for err in res["errors"])

from backend.app.core.config import BASE_DIR

def test_validator_passes_valid_data():
    csv_path = BASE_DIR / "ml" / "datasets" / "synthetic_transactions.csv"
    df = pd.read_csv(str(csv_path), nrows=100)
    res = DatasetValidator.validate_dataset(df, require_target=True)
    assert res["is_valid"] is True
    assert len(res["errors"]) == 0

def test_feature_engineering_single_transaction():
    single_txn = {
        "amount": 25000.0,
        "transaction_type": "TRANSFER",
        "merchant_category": "ELECTRONICS",
        "location": "Mumbai",
        "channel": "ONLINE",
        "timestamp": "2026-03-24 14:30:00",
        "account_age_days": 120,
        "transaction_frequency": 4,
        "previous_transaction_amount": 1200.0,
        "balance_before": 30000.0,
        "balance_after": 5000.0,
        "distance_from_previous_transaction": 12.5,
        "ip_risk": 0.85,
        "device_risk": 0.75,
    }
    
    valid, errors = DatasetValidator.validate_single_transaction(single_txn)
    assert valid is True
    assert len(errors) == 0

    fe = FeatureEngineer()
    # Dummy fit on 1 row dataframe for scaler initialization
    dummy_df = pd.DataFrame([single_txn])
    fe.fit(dummy_df)
    features = fe.transform(single_txn)
    
    assert features.shape == (1, len(FEATURE_COLUMNS))
    assert list(features.columns) == FEATURE_COLUMNS
    assert features["type_TRANSFER"].iloc[0] == 1
    assert features["type_PAYMENT"].iloc[0] == 0
    assert features["cat_ELECTRONICS"].iloc[0] == 1
    assert features["is_high_risk_type"].iloc[0] == 1
