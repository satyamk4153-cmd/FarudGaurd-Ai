from typing import Dict, Any, List, Tuple
from backend.app.models.prediction import RiskLevel
from backend.app.core.config import settings

class RiskEngine:
    """
    Multi-Signal Composite Financial Risk Engine.
    Transparently blends:
      1. Supervised Machine Learning Probability
      2. Unsupervised Isolation Forest Anomaly Score
      3. Real-Time Domain Behavioral / Velocity Heuristics
    Produces final Risk Score (0-100) and actionable Risk Level.
    """
    def __init__(
        self,
        weight_supervised: float = None,
        weight_anomaly: float = None,
        weight_behavioral: float = None,
    ):
        self.w_sup = weight_supervised if weight_supervised is not None else settings.WEIGHT_SUPERVISED
        self.w_anom = weight_anomaly if weight_anomaly is not None else settings.WEIGHT_ANOMALY
        self.w_behav = weight_behavioral if weight_behavioral is not None else settings.WEIGHT_RULE_VELOCITY

        # Normalize weights so they sum exactly to 1.0
        total_w = self.w_sup + self.w_anom + self.w_behav
        self.w_sup /= total_w
        self.w_anom /= total_w
        self.w_behav /= total_w

    def evaluate_transaction(
        self,
        supervised_prob: float,
        anomaly_score: float,
        raw_txn: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluate multi-signal risk for a transaction.
        Returns:
            risk_score: float [0, 100]
            risk_level: RiskLevel (LOW, MEDIUM, HIGH, CRITICAL)
            behavioral_score: float [0, 1]
            triggered_rules: List of descriptive rule triggers
        """
        triggered_rules: List[str] = []
        rule_score = 0.0

        # Rule 1: High Transaction Velocity (Burst)
        freq = int(raw_txn.get("transaction_frequency", 1))
        if freq >= 8:
            rule_score += 0.35
            triggered_rules.append(f"Transaction burst: {freq} transactions recorded in past 24 hours")
        elif freq >= 5:
            rule_score += 0.15
            triggered_rules.append(f"Elevated velocity: {freq} transactions in past 24 hours")

        # Rule 2: Impossible Geographic Travel
        dist = float(raw_txn.get("distance_from_previous_transaction", 0.0))
        if dist >= 1000.0:
            rule_score += 0.35
            triggered_rules.append(f"Impossible travel distance: {dist:.0f} km from previous transaction")
        elif dist >= 500.0:
            rule_score += 0.20
            triggered_rules.append(f"Rapid cross-city jump: {dist:.0f} km from previous location")

        # Rule 3: Abnormal Late-Night High-Value Transfer
        txn_type = str(raw_txn.get("transaction_type", "")).upper()
        amount = float(raw_txn.get("amount", 0.0))
        hour = 12
        if "timestamp" in raw_txn:
            try:
                import pandas as pd
                hour = pd.to_datetime(raw_txn["timestamp"]).hour
            except Exception:
                pass

        if hour in [1, 2, 3, 4] and txn_type in ["TRANSFER", "CASH_OUT"] and amount > 25000:
            rule_score += 0.30
            triggered_rules.append(f"Late-night high-value {txn_type} executed at {hour:02d}:00")

        # Rule 4: High Balance Depletion Ratio
        bal_before = float(raw_txn.get("balance_before", 0.0))
        if bal_before > 0:
            depletion_ratio = amount / bal_before
            if depletion_ratio >= 0.85:
                rule_score += 0.25
                triggered_rules.append(f"Account drain: transaction consumes {depletion_ratio:.0%} of balance")

        # Rule 5: Risky Entity Fingerprint
        ip_risk = float(raw_txn.get("ip_risk", 0.0))
        dev_risk = float(raw_txn.get("device_risk", 0.0))
        if ip_risk >= 0.80 or dev_risk >= 0.80:
            rule_score += 0.25
            triggered_rules.append("High-risk IP address reputation or unrecognized device fingerprint")

        # Cap behavioral risk score to [0.0, 1.0]
        behavioral_score = min(1.0, rule_score)

        # Composite Weighted Calculation
        composite_risk = (
            (self.w_sup * supervised_prob) +
            (self.w_anom * anomaly_score) +
            (self.w_behav * behavioral_score)
        )
        risk_score = round(composite_risk * 100.0, 1)

        # Assign Risk Level
        if risk_score >= 88.0:
            risk_level = RiskLevel.CRITICAL
        elif risk_score >= 70.0:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 35.0:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        return {
            "fraud_probability": round(supervised_prob, 4),
            "anomaly_score": round(anomaly_score, 4),
            "behavioral_score": round(behavioral_score, 4),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "triggered_rules": triggered_rules,
            "weights": {
                "supervised": round(self.w_sup, 2),
                "anomaly": round(self.w_anom, 2),
                "behavioral": round(self.w_behav, 2),
            },
        }
