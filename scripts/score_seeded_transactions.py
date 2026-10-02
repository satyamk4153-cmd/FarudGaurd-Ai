import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.db.session import SessionLocal
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction, RiskLevel, PredictionLabel
from backend.app.models.alert import FraudAlert, AlertStatus
from backend.app.models.investigation import InvestigationCase, InvestigationNote, CaseStatus
from backend.app.models.user import User, UserRole
from backend.app.models.ml_models import ModelVersion
from ml.inference.engine import InferenceEngine

def score_transactions():
    print("--- Scoring Seeded Transactions with Genuine ML & Risk Engine ---")
    db = SessionLocal()
    engine = InferenceEngine.get_instance()
    
    active_mv = db.query(ModelVersion).filter(ModelVersion.status == "ACTIVE").first()
    active_mv_id = active_mv.id if active_mv else None

    # Get analyst user for case assignment
    analyst_user = db.query(User).filter(User.role == UserRole.ANALYST).first()
    analyst_id = analyst_user.id if analyst_user else None

    # Find transactions without prediction
    unscored_txns = db.query(Transaction).outerjoin(Prediction).filter(Prediction.id == None).limit(3000).all()
    print(f"Found {len(unscored_txns)} unscored transactions in database.")

    if not unscored_txns:
        print("All transactions already have predictions.")
        db.close()
        return

    predictions_to_add = []
    alerts_to_add = []
    cases_to_add = []
    notes_to_add = []
    
    case_counter = 1

    for txn in unscored_txns:
        txn_dict = {
            "amount": txn.amount,
            "transaction_type": txn.transaction_type,
            "merchant_category": txn.merchant_category,
            "location": txn.location,
            "channel": txn.channel,
            "timestamp": txn.timestamp,
            "account_age_days": txn.account_age_days,
            "transaction_frequency": txn.transaction_frequency,
            "previous_transaction_amount": txn.previous_transaction_amount,
            "balance_before": txn.balance_before,
            "balance_after": txn.balance_after,
            "distance_from_previous_transaction": txn.distance_from_previous_transaction,
            "ip_risk": txn.ip_risk,
            "device_risk": txn.device_risk,
        }

        # Predict with real engine
        # Only compute detailed SHAP for flagged or subset to optimize speed
        is_suspicious_heuristic = (txn.ip_risk > 0.5 or txn.amount > 50000 or txn.transaction_frequency > 6)
        res = engine.predict_single(txn_dict, compute_shap=is_suspicious_heuristic)

        pred_obj = Prediction(
            transaction_id=txn.id,
            model_version_id=active_mv_id,
            fraud_probability=res["fraud_probability"],
            risk_score=res["risk_score"],
            risk_level=RiskLevel(res["risk_level"]),
            prediction=PredictionLabel(res["prediction"]),
            anomaly_score=res["anomaly_score"],
            explanation_json=json.dumps(res.get("explanation", {})),
            rule_flags_json=json.dumps(res.get("triggered_rules", [])),
            created_at=txn.timestamp,
        )
        predictions_to_add.append(pred_obj)

        # Create FraudAlert for HIGH and CRITICAL risk transactions
        if res["risk_level"] in [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
            reason = "; ".join(res.get("triggered_rules", []))
            if not reason:
                reason = f"High model fraud probability: {res['fraud_probability']:.1%}"

            alert_obj = FraudAlert(
                transaction_id=txn.id,
                severity=RiskLevel(res["risk_level"]),
                status=AlertStatus.NEW if res["risk_level"] == RiskLevel.CRITICAL.value else AlertStatus.UNDER_REVIEW,
                alert_reason=reason,
                created_at=txn.timestamp,
            )
            alerts_to_add.append(alert_obj)

            # Create initial InvestigationCase for the first 15 critical alerts
            if res["risk_level"] == RiskLevel.CRITICAL.value and case_counter <= 15:
                case_obj = InvestigationCase(
                    case_number=f"CASE-2026-{case_counter:04d}",
                    transaction_id=txn.id,
                    assigned_to=analyst_id,
                    priority=RiskLevel.CRITICAL,
                    status=CaseStatus.OPEN if case_counter % 2 == 1 else CaseStatus.UNDER_REVIEW,
                    summary=f"Automated risk engine trigger: {reason}",
                    opened_at=txn.timestamp,
                )
                cases_to_add.append(case_obj)
                case_counter += 1

    print(f"Persisting {len(predictions_to_add)} predictions, {len(alerts_to_add)} alerts, and {len(cases_to_add)} investigation cases...")
    
    # Save predictions
    db.bulk_save_objects(predictions_to_add)
    db.commit()

    # Save alerts
    db.bulk_save_objects(alerts_to_add)
    db.commit()

    # Save cases
    for case in cases_to_add:
        db.add(case)
        db.commit()
        db.refresh(case)
        # Add initial note
        note = InvestigationNote(
            case_id=case.id,
            user_id=analyst_id,
            note=f"Automated case created. Risk score: {case.priority.value}. System detected suspicious behavior matching fraud rules.",
            created_at=case.opened_at,
        )
        db.add(note)
    db.commit()

    db.close()
    print("Successfully scored all seeded transactions and populated alerts and cases!")

if __name__ == "__main__":
    score_transactions()
