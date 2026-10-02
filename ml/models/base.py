from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd

class BaseFraudModel(ABC):
    """
    Abstract base class for all FraudGuard AI supervised and unsupervised models.
    Guarantees consistent interfaces for training, prediction, scoring, and explainability.
    """
    def __init__(self, name: str, algorithm: str, version: str = "v1.0"):
        self.name = name
        self.algorithm = algorithm
        self.version = version
        self.is_fitted = False
        self.optimal_threshold = 0.50
        self.metrics: Dict[str, Any] = {}

    @abstractmethod
    def fit(self, X: pd.DataFrame, y: pd.Series) -> "BaseFraudModel":
        """Fit the model to the training features and labels."""
        pass

    @abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return fraud probabilities [P(legit), P(fraud)] or 1D array of fraud probabilities."""
        pass

    def predict(self, X: pd.DataFrame, threshold: Optional[float] = None) -> np.ndarray:
        """Classify binary fraud predictions using the designated operational threshold."""
        thresh = threshold if threshold is not None else self.optimal_threshold
        probs = self.predict_proba(X)
        if probs.ndim == 2:
            probs = probs[:, 1]
        return (probs >= thresh).astype(int)

    @abstractmethod
    def save(self, filepath: str) -> None:
        """Serialize model artifact to disk."""
        pass

    @classmethod
    @abstractmethod
    def load(cls, filepath: str) -> "BaseFraudModel":
        """Deserialize model artifact from disk."""
        pass
