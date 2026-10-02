"""
Feature Schema Definitions for FraudGuard AI.
Maintains consistent feature lists between training, validation, batch inference, and real-time inference.
"""

from typing import List, Dict, Any

# Raw transaction columns required for input
RAW_REQUIRED_COLUMNS: List[str] = [
    "amount",
    "transaction_type",
    "merchant_category",
    "location",
    "channel",
    "timestamp",
    "account_age_days",
    "transaction_frequency",
    "previous_transaction_amount",
    "balance_before",
    "balance_after",
    "distance_from_previous_transaction",
    "ip_risk",
    "device_risk",
]

# Engineered feature names produced by FeatureEngineer
ENGINEERED_FEATURE_NAMES: List[str] = [
    "amount_log",
    "amount_to_prev_ratio",
    "balance_depletion_ratio",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_night",
    "transaction_frequency",
    "account_age_days",
    "distance_from_previous_transaction",
    "ip_risk",
    "device_risk",
    "is_high_risk_type",
    "is_high_risk_category",
    "type_PAYMENT",
    "type_TRANSFER",
    "type_CASH_OUT",
    "type_ONLINE_PURCHASE",
    "type_DEBIT",
    "cat_GROCERY",
    "cat_RESTAURANT",
    "cat_RETAIL",
    "cat_UTILITIES",
    "cat_TRAVEL",
    "cat_ELECTRONICS",
    "cat_LUXURY",
    "cat_GAMBLING",
]

# Numerical features for scaling
NUMERIC_FEATURES: List[str] = [
    "amount_log",
    "amount_to_prev_ratio",
    "balance_depletion_ratio",
    "hour_of_day",
    "day_of_week",
    "transaction_frequency",
    "account_age_days",
    "distance_from_previous_transaction",
    "ip_risk",
    "device_risk",
]

# Binary / Flag features (already 0 or 1)
BINARY_FEATURES: List[str] = [
    "is_weekend",
    "is_night",
    "is_high_risk_type",
    "is_high_risk_category",
    "type_PAYMENT",
    "type_TRANSFER",
    "type_CASH_OUT",
    "type_ONLINE_PURCHASE",
    "type_DEBIT",
    "cat_GROCERY",
    "cat_RESTAURANT",
    "cat_RETAIL",
    "cat_UTILITIES",
    "cat_TRAVEL",
    "cat_ELECTRONICS",
    "cat_LUXURY",
    "cat_GAMBLING",
]

FEATURE_COLUMNS: List[str] = NUMERIC_FEATURES + BINARY_FEATURES
TARGET_COLUMN: str = "is_fraud"
