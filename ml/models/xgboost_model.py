import os
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
import joblib
from ml.models.base import BaseFraudModel

class FraudXGBoost(BaseFraudModel):
    def __init__(
        self,
        n_estimators: int = 120,
        max_depth: int = 5,
        learning_rate: float = 0.08,
        scale_pos_weight: Optional[float] = None,
        version: str = "v1.0",
    ):
        super().__init__(name="FraudGuard XGBoost Champion", algorithm="XGBoost", version=version)
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.scale_pos_weight = scale_pos_weight
        self.model = None

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "FraudXGBoost":
        self.feature_names = list(X.columns)
        
        # Calculate class imbalance scale weight if not provided
        if self.scale_pos_weight is None:
            num_pos = int((y == 1).sum())
            num_neg = int((y == 0).sum())
            self.scale_pos_weight = float(num_neg / max(1, num_pos))

        self.model = XGBClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            scale_pos_weight=self.scale_pos_weight,
            random_state=42,
            n_jobs=2,
            eval_metric="logloss",
        )
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba(X)

    @property
    def feature_importances_(self) -> np.ndarray:
        return self.model.feature_importances_

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "name": self.name,
            "algorithm": self.algorithm,
            "version": self.version,
            "model": self.model,
            "feature_names": getattr(self, "feature_names", []),
            "optimal_threshold": self.optimal_threshold,
            "metrics": self.metrics,
            "is_fitted": self.is_fitted,
        }, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FraudXGBoost":
        data = joblib.load(filepath)
        instance = cls(version=data.get("version", "v1.0"))
        instance.name = data["name"]
        instance.algorithm = data["algorithm"]
        instance.model = data["model"]
        instance.feature_names = data.get("feature_names", [])
        instance.optimal_threshold = data.get("optimal_threshold", 0.50)
        instance.metrics = data.get("metrics", {})
        instance.is_fitted = data.get("is_fitted", True)
        return instance
