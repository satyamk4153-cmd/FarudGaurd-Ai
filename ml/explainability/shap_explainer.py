import os
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import shap
import joblib

# Human-readable labels for features
FEATURE_HUMAN_LABELS = {
    "amount_log": "High transaction amount",
    "amount_to_prev_ratio": "Spike relative to previous transaction",
    "balance_depletion_ratio": "High account balance depletion",
    "hour_of_day": "Hour of day",
    "day_of_week": "Day of week",
    "is_weekend": "Weekend transaction timing",
    "is_night": "Abnormal late-night activity",
    "transaction_frequency": "High transaction velocity (burst)",
    "account_age_days": "Account age / tenure",
    "distance_from_previous_transaction": "Abnormal geographic travel distance",
    "ip_risk": "Elevated IP address risk score",
    "device_risk": "Unrecognized or high-risk device fingerprint",
    "is_high_risk_type": "High-risk transaction type (Transfer/Cash-out)",
    "is_high_risk_category": "High-risk merchant category",
    "type_TRANSFER": "Direct account transfer",
    "type_CASH_OUT": "Cash withdrawal / cash-out",
    "type_PAYMENT": "Standard payment",
    "type_ONLINE_PURCHASE": "Online card-not-present purchase",
    "type_DEBIT": "Debit operation",
    "cat_GAMBLING": "Gambling or high-risk wagering merchant",
    "cat_LUXURY": "Luxury goods purchase",
    "cat_ELECTRONICS": "High-value electronics purchase",
    "cat_TRAVEL": "Travel / airline booking",
    "cat_GROCERY": "Everyday grocery purchase",
    "cat_RESTAURANT": "Dining / restaurant spend",
    "cat_RETAIL": "General retail shopping",
    "cat_UTILITIES": "Utility bill payment",
}

class FraudShapExplainer:
    """
    Computes genuine Shapley values for individual transactions and global model behavior.
    Translates mathematical SHAP attributions into operational risk factors.
    """
    def __init__(self, model: Any, feature_names: List[str], background_data: Optional[pd.DataFrame] = None):
        self.model = model
        self.feature_names = feature_names
        self.is_tree = hasattr(model, "feature_importances_") or "XGB" in str(type(model)) or "LGBM" in str(type(model))
        
        if self.is_tree:
            try:
                self.explainer = shap.TreeExplainer(model)
            except Exception:
                bg = background_data.iloc[:50] if background_data is not None else None
                self.explainer = shap.Explainer(model.predict_proba if hasattr(model, "predict_proba") else model, bg)
        else:
            # Linear model or fallback
            bg = background_data.iloc[:100] if background_data is not None else None
            try:
                self.explainer = shap.LinearExplainer(model, bg if bg is not None else np.zeros((1, len(feature_names))))
            except Exception:
                self.explainer = None  # Will use direct linear attribution via coef_

    def explain_instance(self, X_row: pd.DataFrame, top_k: int = 6) -> Dict[str, Any]:
        """
        Compute local SHAP attribution for a single transaction.
        Returns positive factors (pushing risk UP) and negative factors (pushing risk DOWN).
        """
        # Ensure single row dataframe
        if len(X_row) != 1:
            X_row = X_row.iloc[[0]]

        shap_values = self.explainer.shap_values(X_row)

        # Handle different SHAP output shapes across XGBoost / Scikit-learn / LightGBM
        if isinstance(shap_values, list):
            # Binary classification list: [class_0, class_1]
            raw_vals = shap_values[1][0]
        elif isinstance(shap_values, np.ndarray):
            if shap_values.ndim == 3:
                raw_vals = shap_values[0, :, 1]
            elif shap_values.ndim == 2:
                raw_vals = shap_values[0]
            else:
                raw_vals = shap_values
        else:
            raw_vals = np.array(shap_values.values[0])

        feature_contributions = []
        for i, col in enumerate(self.feature_names):
            val = float(raw_vals[i])
            actual_val = float(X_row[col].iloc[0])
            label = FEATURE_HUMAN_LABELS.get(col, col.replace("_", " ").title())
            feature_contributions.append({
                "feature": col,
                "label": label,
                "shap_value": round(val, 4),
                "actual_value": round(actual_val, 2),
                "impact": "INCREASES_RISK" if val > 0 else "REDUCES_RISK",
            })

        # Sort by absolute SHAP magnitude
        sorted_by_abs = sorted(feature_contributions, key=lambda x: abs(x["shap_value"]), reverse=True)
        top_factors = sorted_by_abs[:top_k]

        positive_factors = [f for f in sorted_by_abs if f["shap_value"] > 0][:4]
        negative_factors = [f for f in sorted_by_abs if f["shap_value"] < 0][:4]

        # Calculate base value (expected value)
        base_val = getattr(self.explainer, "expected_value", 0.0)
        if isinstance(base_val, (list, np.ndarray)):
            base_val = float(base_val[1] if len(base_val) > 1 else base_val[0])
        else:
            base_val = float(base_val)

        return {
            "base_value": round(base_val, 4),
            "top_factors": top_factors,
            "positive_factors": positive_factors,
            "negative_factors": negative_factors,
            "all_attributions": feature_contributions,
        }

    def explain_global(self, X_sample: pd.DataFrame) -> List[Dict[str, Any]]:
        """Compute global feature importance based on mean absolute SHAP values."""
        sample_df = X_sample.iloc[:min(300, len(X_sample))]
        shap_values = self.explainer.shap_values(sample_df)

        if isinstance(shap_values, list):
            vals = shap_values[1]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            vals = shap_values[:, :, 1]
        elif hasattr(shap_values, "values"):
            vals = shap_values.values
        else:
            vals = shap_values

        mean_abs = np.mean(np.abs(vals), axis=0)
        global_importance = []
        for i, col in enumerate(self.feature_names):
            label = FEATURE_HUMAN_LABELS.get(col, col.replace("_", " ").title())
            global_importance.append({
                "feature": col,
                "label": label,
                "importance": round(float(mean_abs[i]), 4),
            })

        return sorted(global_importance, key=lambda x: x["importance"], reverse=True)

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "explainer": self.explainer,
            "feature_names": self.feature_names,
        }, filepath)

    @classmethod
    def load(cls, filepath: str, model: Any) -> "FraudShapExplainer":
        data = joblib.load(filepath)
        instance = cls.__new__(cls)
        instance.model = model
        instance.feature_names = data["feature_names"]
        instance.explainer = data["explainer"]
        return instance
