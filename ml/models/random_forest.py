import os
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
from ml.models.base import BaseFraudModel

class FraudRandomForest(BaseFraudModel):
    def __init__(self, n_estimators: int = 100, max_depth: int = 12, version: str = "v1.0"):
        super().__init__(name="FraudGuard Random Forest", algorithm="RandomForest", version=version)
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            class_weight="balanced",
            random_state=42,
            n_jobs=2,
        )

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "FraudRandomForest":
        self.feature_names = list(X.columns)
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
    def load(cls, filepath: str) -> "FraudRandomForest":
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
