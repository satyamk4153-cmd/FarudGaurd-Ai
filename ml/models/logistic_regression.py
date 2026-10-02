import os
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
import joblib
from ml.models.base import BaseFraudModel

class FraudLogisticRegression(BaseFraudModel):
    def __init__(self, C: float = 1.0, max_iter: int = 1000, version: str = "v1.0"):
        super().__init__(name="FraudGuard Logistic Regression Baseline", algorithm="LogisticRegression", version=version)
        self.C = C
        self.max_iter = max_iter
        self.model = LogisticRegression(
            C=self.C,
            max_iter=self.max_iter,
            class_weight="balanced",
            random_state=42,
            solver="lbfgs",
        )

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "FraudLogisticRegression":
        self.feature_names = list(X.columns)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba(X)

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
    def load(cls, filepath: str) -> "FraudLogisticRegression":
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
