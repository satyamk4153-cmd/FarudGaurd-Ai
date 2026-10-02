from typing import Dict, Any, List
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix

class ThresholdOptimizer:
    """
    Evaluates decision thresholds and conducts cost-sensitive analysis.
    Cost of False Negative (missed fraud) is significantly higher than False Positive (analyst review cost).
    """
    def __init__(self, cost_fn: float = 500.0, cost_fp: float = 25.0):
        self.cost_fn = cost_fn
        self.cost_fp = cost_fp

    def analyze_thresholds(
        self,
        y_true: np.ndarray,
        y_prob: np.ndarray,
        thresholds: List[float] = None,
    ) -> Dict[str, Any]:
        """Compute performance and cost across a range of decision thresholds."""
        if thresholds is None:
            thresholds = [round(t, 2) for t in np.arange(0.10, 0.95, 0.05)]

        results = []
        best_f1 = -1.0
        best_f1_threshold = 0.50
        min_cost = float("inf")
        best_cost_threshold = 0.50

        for t in thresholds:
            y_pred = (y_prob >= t).astype(int)
            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            
            cm = confusion_matrix(y_true, y_pred)
            tn = int(cm[0, 0])
            fp = int(cm[0, 1])
            fn = int(cm[1, 0])
            tp = int(cm[1, 1])

            total_financial_loss = (fn * self.cost_fn) + (fp * self.cost_fp)

            if f1 > best_f1:
                best_f1 = f1
                best_f1_threshold = t

            if total_financial_loss < min_cost:
                min_cost = total_financial_loss
                best_cost_threshold = t

            results.append({
                "threshold": t,
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "tn": tn,
                "financial_loss": round(total_financial_loss, 2),
            })

        return {
            "optimal_f1_threshold": best_f1_threshold,
            "optimal_f1_score": round(best_f1, 4),
            "optimal_cost_threshold": best_cost_threshold,
            "min_financial_loss": round(min_cost, 2),
            "threshold_curve": results,
        }
