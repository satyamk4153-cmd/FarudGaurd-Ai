import os
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

class FraudIsolationForest:
    """
    Unsupervised Anomaly Detector based on Isolation Forest.
    Computes normalized anomaly score [0.0 = completely normal, 1.0 = maximum anomaly].
    """
    def __init__(self, contamination: float = 0.035, n_estimators: int = 100, version: str = "v1.0"):
        self.name = "FraudGuard Isolation Forest"
        self.algorithm = "IsolationForest"
        self.version = version
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=42,
            n_jobs=2,
        )
        self.is_fitted = False
        self.anomaly_threshold = 0.65

    def fit(self, X: pd.DataFrame) -> "FraudIsolationForest":
        self.feature_names = list(X.columns)
        self.model.fit(X)
        self.is_fitted = True
        return self

    def score_anomaly(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns:
            normalized_scores: float array in [0.0, 1.0] where higher means more anomalous
            is_anomaly: boolean array indicating whether score exceeds anomaly_threshold
        """
        # score_samples returns opposite of anomaly score (lower is more anomalous)
        # raw range usually in [-0.5, 0.5]
        raw_scores = self.model.score_samples(X)
        
        # Invert and normalize to [0, 1]:
        # Typically raw scores for normal instances are around -0.4 to -0.45; anomalies around -0.6 to -0.8
        # We map raw score to [0, 1] using min-max sigmoid or clipped linear scaling
        normalized = np.clip(( -raw_scores - 0.40) / 0.35, 0.0, 1.0)
        is_anomaly = normalized >= self.anomaly_threshold
        return normalized, is_anomaly

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "name": self.name,
            "algorithm": self.algorithm,
            "version": self.version,
            "model": self.model,
            "feature_names": getattr(self, "feature_names", []),
            "anomaly_threshold": self.anomaly_threshold,
            "is_fitted": self.is_fitted,
        }, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FraudIsolationForest":
        data = joblib.load(filepath)
        instance = cls(version=data.get("version", "v1.0"))
        instance.name = data["name"]
        instance.algorithm = data["algorithm"]
        instance.model = data["model"]
        instance.feature_names = data.get("feature_names", [])
        instance.anomaly_threshold = data.get("anomaly_threshold", 0.65)
        instance.is_fitted = data.get("is_fitted", True)
        return instance
