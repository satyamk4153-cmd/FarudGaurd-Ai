import math
import os
from typing import Dict, Any, Union, List, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib

from ml.features.schema import (
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    BINARY_FEATURES,
)

HIGH_RISK_TYPES = {"TRANSFER", "CASH_OUT"}
HIGH_RISK_CATEGORIES = {"GAMBLING", "LUXURY", "ELECTRONICS"}

KNOWN_TYPES = ["PAYMENT", "TRANSFER", "CASH_OUT", "ONLINE_PURCHASE", "DEBIT"]
KNOWN_CATEGORIES = [
    "GROCERY", "RESTAURANT", "RETAIL", "UTILITIES",
    "TRAVEL", "ELECTRONICS", "LUXURY", "GAMBLING"
]

class FeatureEngineer:
    """
    Transforms raw transaction inputs into production ML features.
    Guarantees zero data leakage and exact schema parity between training and real-time inference.
    """
    def __init__(self, scaler: Optional[StandardScaler] = None):
        self.scaler = scaler or StandardScaler()
        self.is_fitted = False

    def fit(self, df: pd.DataFrame) -> "FeatureEngineer":
        """Fit scaler only on training data (preventing data leakage)."""
        engineered_df = self._extract_features(df)
        self.scaler.fit(engineered_df[NUMERIC_FEATURES])
        self.is_fitted = True
        return self

    def transform(self, data: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> pd.DataFrame:
        """Transform single or batch transactions into scaled model-ready feature matrix."""
        if isinstance(data, dict):
            df = pd.DataFrame([data])
        elif isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()

        engineered_df = self._extract_features(df)
        
        # Scale numeric features if fitted
        if self.is_fitted:
            scaled_vals = self.scaler.transform(engineered_df[NUMERIC_FEATURES])
            scaled_numeric_df = pd.DataFrame(scaled_vals, columns=NUMERIC_FEATURES, index=engineered_df.index)
            # Combine scaled numeric with binary features
            result_df = pd.concat([scaled_numeric_df, engineered_df[BINARY_FEATURES]], axis=1)
        else:
            result_df = engineered_df[FEATURE_COLUMNS]

        # Reindex to strictly enforce column ordering
        return result_df[FEATURE_COLUMNS]

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convenience method for training pipeline."""
        return self.fit(df).transform(df)

    def _extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract unscaled engineered features from raw data."""
        df = df.copy()
        defaults = {
            "amount": 0.0,
            "previous_transaction_amount": 0.0,
            "balance_before": 0.0,
            "transaction_frequency": 1,
            "account_age_days": 30,
            "distance_from_previous_transaction": 0.0,
            "ip_risk": 0.1,
            "device_risk": 0.1,
            "transaction_type": "PAYMENT",
            "merchant_category": "OTHER",
        }
        for col, val in defaults.items():
            if col not in df.columns:
                df[col] = val

        out = pd.DataFrame(index=df.index)
        
        # 1. Parse Timestamps & Temporal Features
        if "timestamp" in df.columns:
            timestamps = pd.to_datetime(df["timestamp"], errors="coerce")
        else:
            timestamps = pd.to_datetime(pd.Series([pd.Timestamp.now(tz="UTC")] * len(df), index=df.index))
        out["hour_of_day"] = timestamps.dt.hour.fillna(12).astype(int)
        out["day_of_week"] = timestamps.dt.dayofweek.fillna(0).astype(int)
        out["is_weekend"] = out["day_of_week"].isin([5, 6]).astype(int)
        out["is_night"] = out["hour_of_day"].isin([1, 2, 3, 4]).astype(int)

        # 2. Amounts & Ratios
        amounts = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0).clip(lower=0.0)
        out["amount_log"] = np.log1p(amounts)
        
        prev_amounts = pd.to_numeric(df["previous_transaction_amount"], errors="coerce").fillna(0.0).clip(lower=0.0)
        # Avoid division by zero
        out["amount_to_prev_ratio"] = (amounts / np.maximum(prev_amounts, 1.0)).clip(upper=50.0)

        balance_before = pd.to_numeric(df["balance_before"], errors="coerce").fillna(0.0).clip(lower=0.0)
        out["balance_depletion_ratio"] = (amounts / np.maximum(balance_before, 1.0)).clip(upper=10.0)

        # 3. Behavioral & Contextual Passthrough / Cleansed
        out["transaction_frequency"] = pd.to_numeric(df["transaction_frequency"], errors="coerce").fillna(1).clip(lower=1, upper=50)
        out["account_age_days"] = pd.to_numeric(df["account_age_days"], errors="coerce").fillna(30).clip(lower=0)
        out["distance_from_previous_transaction"] = pd.to_numeric(df["distance_from_previous_transaction"], errors="coerce").fillna(0.0).clip(lower=0.0)
        out["ip_risk"] = pd.to_numeric(df["ip_risk"], errors="coerce").fillna(0.1).clip(0.0, 1.0)
        out["device_risk"] = pd.to_numeric(df["device_risk"], errors="coerce").fillna(0.1).clip(0.0, 1.0)

        # 4. Domain Heuristic Risk Indicators
        txn_types = df["transaction_type"].astype(str).str.upper()
        categories = df["merchant_category"].astype(str).str.upper()

        out["is_high_risk_type"] = txn_types.isin(HIGH_RISK_TYPES).astype(int)
        out["is_high_risk_category"] = categories.isin(HIGH_RISK_CATEGORIES).astype(int)

        # 5. One-Hot Predefined Categoricals (fixed dummy schema)
        for t in KNOWN_TYPES:
            col_name = f"type_{t}"
            out[col_name] = (txn_types == t).astype(int)

        for c in KNOWN_CATEGORIES:
            col_name = f"cat_{c}"
            out[col_name] = (categories == c).astype(int)

        return out

    def save(self, filepath: str):
        """Serialize fitted feature engineer artifact."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({"scaler": self.scaler, "is_fitted": self.is_fitted}, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FeatureEngineer":
        """Load fitted feature engineer from disk."""
        data = joblib.load(filepath)
        engineer = cls(scaler=data["scaler"])
        engineer.is_fitted = data["is_fitted"]
        return engineer
