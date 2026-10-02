from typing import Dict, Any, List, Tuple
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
)

def compute_precision_at_k(y_true: np.ndarray, y_prob: np.ndarray, k_percent: float = 0.05) -> float:
    """Calculate precision among top K% highest risk predictions."""
    k = max(1, int(len(y_prob) * k_percent))
    top_indices = np.argsort(y_prob)[::-1][:k]
    return float(np.mean(y_true[top_indices]))

def compute_recall_at_k(y_true: np.ndarray, y_prob: np.ndarray, k_percent: float = 0.05) -> float:
    """Calculate recall among top K% highest risk predictions."""
    total_positives = int(np.sum(y_true))
    if total_positives == 0:
        return 0.0
    k = max(1, int(len(y_prob) * k_percent))
    top_indices = np.argsort(y_prob)[::-1][:k]
    captured_positives = int(np.sum(y_true[top_indices]))
    return float(captured_positives / total_positives)

def evaluate_model_performance(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.50,
) -> Dict[str, Any]:
    """
    Comprehensive evaluation of binary fraud model.
    Calculates standard and cost-aware financial metrics, curves, and confusion matrix.
    """
    y_true = np.array(y_true)
    y_prob = np.array(y_prob)
    y_pred = (y_prob >= threshold).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        roc_auc = 0.5
        
    try:
        pr_auc = float(average_precision_score(y_true, y_prob))
    except Exception:
        pr_auc = 0.0

    cm = confusion_matrix(y_true, y_pred).tolist()
    # cm format: [[TN, FP], [FN, TP]]

    p_at_1 = compute_precision_at_k(y_true, y_prob, 0.01)
    p_at_5 = compute_precision_at_k(y_true, y_prob, 0.05)
    r_at_1 = compute_recall_at_k(y_true, y_prob, 0.01)
    r_at_5 = compute_recall_at_k(y_true, y_prob, 0.05)

    # Subsample ROC curve points (max 50 points) for lightweight chart rendering
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    step = max(1, len(fpr) // 40)
    roc_points = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in range(0, len(fpr), step)]
    if roc_points[-1]["fpr"] != 1.0:
        roc_points.append({"fpr": 1.0, "tpr": 1.0})

    # Subsample PR curve points
    p_curve, r_curve, _ = precision_recall_curve(y_true, y_prob)
    step_pr = max(1, len(p_curve) // 40)
    pr_points = [{"recall": round(float(r_curve[i]), 4), "precision": round(float(p_curve[i]), 4)} for i in range(0, len(p_curve), step_pr)]

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "precision_at_1pct": round(p_at_1, 4),
        "precision_at_5pct": round(p_at_5, 4),
        "recall_at_1pct": round(r_at_1, 4),
        "recall_at_5pct": round(r_at_5, 4),
        "threshold": threshold,
        "confusion_matrix": cm,
        "roc_curve": roc_points,
        "pr_curve": pr_points,
    }
