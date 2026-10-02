from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from ml.features.schema import RAW_REQUIRED_COLUMNS

class DatasetValidator:
    """
    Validates CSV datasets and single transactions for compliance with FraudGuard AI's schema.
    Produces comprehensive data quality profiles and detects anomalies or corruption.
    """
    
    @staticmethod
    def validate_dataset(df: pd.DataFrame, require_target: bool = False) -> Dict[str, Any]:
        """Validate an entire pandas DataFrame and compute an audit quality profile."""
        errors: List[str] = []
        warnings: List[str] = []
        
        # 1. Check Row Count
        if len(df) == 0:
            return {
                "is_valid": False,
                "errors": ["Dataset is empty (0 rows)."],
                "warnings": [],
                "profile": {},
            }
        
        # 2. Check Required Columns
        missing_cols = [c for c in RAW_REQUIRED_COLUMNS if c not in df.columns]
        if missing_cols:
            errors.append(f"Missing required columns: {', '.join(missing_cols)}")

        if require_target and "is_fraud" not in df.columns:
            errors.append("Target column 'is_fraud' is required for training/evaluation datasets.")

        # If critical required columns are missing, return early
        if errors:
            return {
                "is_valid": False,
                "errors": errors,
                "warnings": warnings,
                "profile": {"row_count": len(df), "column_count": len(df.columns)},
            }

        # 3. Check Duplicate External Transaction IDs if present
        duplicate_count = 0
        if "external_transaction_id" in df.columns:
            duplicate_count = int(df["external_transaction_id"].duplicated().sum())
            if duplicate_count > 0:
                warnings.append(f"Found {duplicate_count} duplicate external_transaction_id records.")

        # 4. Check Missing / Null Values
        missing_dict = df[RAW_REQUIRED_COLUMNS].isnull().sum().to_dict()
        total_missing = sum(missing_dict.values())
        if total_missing > 0:
            warnings.append(f"Dataset contains {total_missing} null values across required columns.")

        # 5. Check Impossible Values
        if (df["amount"] < 0).any():
            errors.append("Found negative transaction amounts, which are invalid.")

        if (df["ip_risk"] < 0).any() or (df["ip_risk"] > 1).any():
            warnings.append("Some ip_risk values are outside the standard [0, 1] range.")

        if (df["device_risk"] < 0).any() or (df["device_risk"] > 1).any():
            warnings.append("Some device_risk values are outside the standard [0, 1] range.")

        # 6. Compute Data Quality Profile
        profile: Dict[str, Any] = {
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "duplicate_count": duplicate_count,
            "missing_values": {k: int(v) for k, v in missing_dict.items() if v > 0},
            "numeric_stats": {},
            "class_distribution": {},
        }

        # Numeric Statistics
        num_cols = ["amount", "account_age_days", "transaction_frequency", "balance_before", "balance_after"]
        for col in num_cols:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors="coerce").dropna()
                profile["numeric_stats"][col] = {
                    "min": float(series.min()) if len(series) else 0.0,
                    "max": float(series.max()) if len(series) else 0.0,
                    "mean": float(series.mean()) if len(series) else 0.0,
                    "std": float(series.std()) if len(series) else 0.0,
                }

        # Class Distribution if target present
        if "is_fraud" in df.columns:
            target_series = pd.to_numeric(df["is_fraud"], errors="coerce").dropna()
            fraud_count = int((target_series == 1).sum())
            legit_count = int((target_series == 0).sum())
            fraud_rate = float(fraud_count / len(target_series)) if len(target_series) > 0 else 0.0
            profile["class_distribution"] = {
                "legitimate": legit_count,
                "fraud": fraud_count,
                "fraud_rate": round(fraud_rate, 4),
            }
            if fraud_count == 0:
                warnings.append("No fraud samples detected in dataset ('is_fraud' has 0 positive labels).")
            elif fraud_rate > 0.40:
                warnings.append(f"Unusually high fraud rate ({fraud_rate:.1%}). Real-world fraud is typically < 5%.")

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "profile": profile,
        }

    @staticmethod
    def validate_single_transaction(txn: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate a single transaction dictionary for real-time inference."""
        errors: List[str] = []
        for col in RAW_REQUIRED_COLUMNS:
            if col not in txn:
                errors.append(f"Missing required field: '{col}'")
        
        if "amount" in txn:
            try:
                amt = float(txn["amount"])
                if amt <= 0:
                    errors.append("Transaction amount must be strictly greater than 0.")
            except (ValueError, TypeError):
                errors.append("Transaction amount must be a valid numeric value.")
                
        return len(errors) == 0, errors
