"""
FraudGuard AI — Safe Read-Only Copilot Tool Registry
Provides authoritative data retrieval tools executed strictly by the backend application
and supplied to the Google Gemini Generative Analyst Assistant.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case, or_

from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction, RiskLevel
from backend.app.models.alert import FraudAlert, AlertStatus
from backend.app.models.investigation import InvestigationCase, InvestigationNote, CaseStatus
from backend.app.models.ml_models import ModelVersion, ModelEvaluation, Dataset, ModelStatus
from ml.inference.engine import InferenceEngine

logger = logging.getLogger("fraudguard.copilot_tools")

class CopilotTools:
    """Safe, read-only analytical tools for the Gemini Analyst Assistant."""

    @staticmethod
    def get_transaction(db: Session, transaction_id: str) -> Dict[str, Any]:
        """Look up a transaction dossier by internal ID or external ID."""
        clean_id = transaction_id.strip()
        query = db.query(Transaction).filter(
            or_(
                Transaction.external_transaction_id.ilike(f"%{clean_id}%"),
                Transaction.id == (int(clean_id) if clean_id.isdigit() else -1)
            )
        )
        txn = query.first()
        if not txn:
            return {"status": "NOT_FOUND", "message": f"No transaction found matching identifier '{transaction_id}'."}

        pred = txn.prediction
        pred_data = None
        if pred:
            rule_flags = []
            if pred.rule_flags_json:
                try:
                    rule_flags = json.loads(pred.rule_flags_json)
                except Exception:
                    pass
            m_ver = pred.model_version.name if hasattr(pred.model_version, "name") else (str(pred.model_version) if pred.model_version else "FraudGuard XGBoost Champion v1.0")
            pred_data = {
                "prediction": pred.prediction.value,
                "risk_score": round(pred.risk_score, 1),
                "risk_level": pred.risk_level.value,
                "fraud_probability": round(pred.fraud_probability, 4),
                "anomaly_score": round(pred.anomaly_score, 4),
                "model_version": m_ver,
                "triggered_rules": rule_flags,
            }

        return {
            "status": "FOUND",
            "transaction_id": txn.id,
            "external_transaction_id": txn.external_transaction_id,
            "amount": float(txn.amount),
            "currency": txn.currency,
            "merchant_category": txn.merchant_category,
            "merchant_id": txn.merchant_id,
            "customer_id": txn.customer_id,
            "location": txn.location,
            "channel": txn.channel,
            "device_risk": round(float(txn.device_risk), 2) if txn.device_risk is not None else 0.0,
            "ip_risk": round(float(txn.ip_risk), 2) if txn.ip_risk is not None else 0.0,
            "timestamp": txn.timestamp.isoformat() if txn.timestamp else None,
            "prediction": pred_data,
        }

    @staticmethod
    def search_transactions(db: Session, query: Optional[str] = None, risk_level: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search transactions by text query, user, merchant, or risk tier."""
        q = db.query(Transaction, Prediction).outerjoin(Prediction, Prediction.transaction_id == Transaction.id)
        if query:
            clean_q = f"%{query.strip()}%"
            q = q.filter(
                or_(
                    Transaction.external_transaction_id.ilike(clean_q),
                    Transaction.customer_id.ilike(clean_q),
                    Transaction.merchant_category.ilike(clean_q),
                    Transaction.location.ilike(clean_q),
                )
            )
        if risk_level:
            clean_level = risk_level.strip().upper()
            if clean_level in RiskLevel.__members__:
                q = q.filter(Prediction.risk_level == RiskLevel[clean_level])

        results = q.order_by(desc(Transaction.timestamp)).limit(min(limit, 10)).all()
        output = []
        for t, p in results:
            output.append({
                "id": t.id,
                "external_id": t.external_transaction_id,
                "amount": float(t.amount),
                "currency": t.currency,
                "merchant_category": t.merchant_category,
                "location": t.location,
                "risk_score": round(p.risk_score, 1) if p else None,
                "risk_level": p.risk_level.value if p else "UNEVALUATED",
                "fraud_probability": round(p.fraud_probability, 4) if p else None,
            })
        return output

    @staticmethod
    def get_highest_risk_transactions(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieve highest risk transactions currently ranked by the ML scoring engine."""
        results = (
            db.query(Transaction, Prediction)
            .join(Prediction, Prediction.transaction_id == Transaction.id)
            .order_by(desc(Prediction.risk_score))
            .limit(min(limit, 10))
            .all()
        )
        output = []
        for t, p in results:
            output.append({
                "id": t.id,
                "external_id": t.external_transaction_id,
                "amount": float(t.amount),
                "currency": t.currency,
                "category": t.merchant_category,
                "location": t.location,
                "risk_score": round(p.risk_score, 1),
                "risk_level": p.risk_level.value,
                "fraud_probability": round(p.fraud_probability, 4),
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            })
        return output

    @staticmethod
    def get_alerts(db: Session, limit: int = 5, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active fraud triage alerts filtered optionally by status."""
        q = db.query(FraudAlert).order_by(desc(FraudAlert.created_at))
        if status:
            clean_st = status.strip().upper()
            if clean_st in AlertStatus.__members__:
                q = q.filter(FraudAlert.status == AlertStatus[clean_st])
        results = q.limit(min(limit, 10)).all()
        return [
            {
                "id": a.id,
                "alert_id": a.alert_id,
                "severity": a.severity.value,
                "status": a.status.value,
                "trigger_reason": a.trigger_reason,
                "risk_score": round(a.risk_score, 1),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in results
        ]

    @staticmethod
    def get_alert_summary(db: Session) -> Dict[str, Any]:
        """Aggregate statistical summary of alerts queue."""
        total = db.query(FraudAlert).count()
        critical = db.query(FraudAlert).filter(FraudAlert.severity == RiskLevel.CRITICAL).count()
        high = db.query(FraudAlert).filter(FraudAlert.severity == RiskLevel.HIGH).count()
        new_q = db.query(FraudAlert).filter(FraudAlert.status == AlertStatus.NEW).count()
        under_review = db.query(FraudAlert).filter(FraudAlert.status == AlertStatus.UNDER_REVIEW).count()
        resolved = db.query(FraudAlert).filter(FraudAlert.status.in_([AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE])).count()

        return {
            "total_alerts": total,
            "critical_severity_count": critical,
            "high_severity_count": high,
            "new_unreviewed_count": new_q,
            "under_review_count": under_review,
            "resolved_count": resolved,
        }

    @staticmethod
    def get_investigation(db: Session, case_id: int) -> Dict[str, Any]:
        """Retrieve formal investigation dossier details and attached transactions."""
        case_obj = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case_obj:
            return {"status": "NOT_FOUND", "message": f"No investigation case found with ID {case_id}."}

        attached_txns = []
        if case_obj.transaction_ids_json:
            try:
                attached_txns = json.loads(case_obj.transaction_ids_json)
            except Exception:
                pass

        notes = [
            {"note": n.note_text, "analyst_id": n.analyst_id, "created_at": n.created_at.isoformat() if n.created_at else None}
            for n in case_obj.notes
        ]

        return {
            "status": "FOUND",
            "case_id": case_obj.id,
            "case_number": case_obj.case_id,
            "title": case_obj.title,
            "description": case_obj.description,
            "priority": case_obj.priority.value,
            "status": case_obj.status.value,
            "total_exposure_amount": float(case_obj.total_amount_at_risk or 0.0),
            "attached_transaction_ids": attached_txns,
            "notes": notes,
            "created_at": case_obj.created_at.isoformat() if case_obj.created_at else None,
        }

    @staticmethod
    def get_investigation_timeline(db: Session, case_id: int) -> List[Dict[str, Any]]:
        """Retrieve historical chronology of analyst actions for an investigation case."""
        notes = (
            db.query(InvestigationNote)
            .filter(InvestigationNote.case_id == case_id)
            .order_by(InvestigationNote.created_at.asc())
            .all()
        )
        return [
            {
                "timestamp": n.created_at.isoformat() if n.created_at else None,
                "analyst_id": n.analyst_id,
                "entry": n.note_text,
            }
            for n in notes
        ]

    @staticmethod
    def get_model_information(db: Session) -> Dict[str, Any]:
        """Retrieve active production champion model parameters and registry status."""
        active_model = db.query(ModelVersion).filter(ModelVersion.status == ModelStatus.ACTIVE).first()
        if not active_model:
            active_model = db.query(ModelVersion).order_by(desc(ModelVersion.created_at)).first()

        engine = InferenceEngine.get_instance()
        cached_model_name = engine.active_model.name if (engine.is_loaded and engine.active_model) else "None"

        if not active_model:
            return {
                "model_name": cached_model_name,
                "algorithm": engine.model_info.get("algorithm", "XGBoost"),
                "version": engine.model_info.get("version", "v1.0"),
                "status": "LOADED_FROM_DISK",
                "notes": "Model loaded into memory cache from pre-trained artifacts.",
            }

        return {
            "model_id": active_model.id,
            "model_name": active_model.name,
            "version": active_model.version,
            "algorithm": active_model.algorithm,
            "status": active_model.status.value if active_model.status else "ACTIVE",
            "is_active_champion": active_model.status == ModelStatus.ACTIVE,
            "threshold": active_model.threshold or 0.75,
            "memory_cache_model": cached_model_name,
            "created_at": active_model.created_at.isoformat() if active_model.created_at else None,
        }

    @staticmethod
    def get_model_metrics(db: Session) -> Dict[str, Any]:
        """Retrieve quantitative evaluation metrics (ROC-AUC, PR-AUC, F1) for the active model."""
        active_model = db.query(ModelVersion).filter(ModelVersion.status == ModelStatus.ACTIVE).first()
        if not active_model:
            active_model = db.query(ModelVersion).order_by(desc(ModelVersion.created_at)).first()

        if not active_model or not active_model.evaluations:
            return {
                "model_name": active_model.name if active_model else "XGBoost Champion",
                "algorithm": active_model.algorithm if active_model else "XGBoost",
                "precision": None,
                "recall": None,
                "f1_score": None,
                "roc_auc": None,
                "pr_auc": None,
                "threshold": active_model.threshold if active_model else 0.75,
                "source": "No evaluation record available",
            }

        ev = active_model.evaluations[0]
        return {
            "model_name": active_model.name,
            "version": active_model.version,
            "algorithm": active_model.algorithm,
            "split_evaluated": ev.split_evaluated,
            "precision": round(ev.precision, 4) if ev.precision is not None else None,
            "recall": round(ev.recall, 4) if ev.recall is not None else None,
            "f1_score": round(ev.f1_score, 4) if ev.f1_score is not None else None,
            "roc_auc": round(ev.roc_auc, 4) if ev.roc_auc is not None else None,
            "pr_auc": round(ev.pr_auc, 4) if ev.pr_auc is not None else None,
            "threshold": active_model.threshold or 0.75,
        }

    @staticmethod
    def get_dataset_summary(db: Session) -> Dict[str, Any]:
        """Summary of datasets registered in data catalog."""
        ds_count = db.query(Dataset).count()
        total_txns = db.query(Transaction).count()
        fraud_txns = db.query(Transaction).filter(Transaction.is_fraud == True).count()
        return {
            "registered_datasets_count": ds_count,
            "total_transactions_in_store": total_txns,
            "fraud_labeled_transactions": fraud_txns,
            "fraud_prevalence_pct": round((fraud_txns / total_txns * 100), 2) if total_txns > 0 else 0.0,
        }

    @staticmethod
    def get_dashboard_summary(db: Session, days: int = 30) -> Dict[str, Any]:
        """High-level executive financial risk KPIs."""
        total = db.query(Transaction).count()
        fraud_count = db.query(Prediction).filter(Prediction.prediction == "FRAUD").count()
        avg_risk = db.query(func.avg(Prediction.risk_score)).scalar() or 0.0
        alerts_crit = db.query(FraudAlert).filter(FraudAlert.severity == RiskLevel.CRITICAL).count()
        cases_open = db.query(InvestigationCase).filter(InvestigationCase.status.in_([CaseStatus.OPEN, CaseStatus.UNDER_REVIEW])).count()

        return {
            "timeframe_days": days,
            "total_transactions": total,
            "potential_fraud_transactions": fraud_count,
            "fraud_rate_pct": round((fraud_count / total * 100), 2) if total > 0 else 0.0,
            "average_risk_score": round(float(avg_risk), 1),
            "critical_alerts_open": alerts_crit,
            "open_investigations": cases_open,
        }

    @staticmethod
    def get_fraud_trends(db: Session, days: int = 7) -> List[Dict[str, Any]]:
        """Volume and risk trend trajectory over the past N days."""
        trends = (
            db.query(
                func.date(Transaction.timestamp).label("date"),
                func.count(Transaction.id).label("total"),
                func.sum(case((Transaction.is_fraud == True, 1), else_=0)).label("fraud")
            )
            .group_by(func.date(Transaction.timestamp))
            .order_by(desc("date"))
            .limit(min(days, 30))
            .all()
        )
        return [
            {
                "date": str(t.date),
                "total_volume": t.total,
                "fraud_count": t.fraud or 0,
            }
            for t in reversed(trends)
        ]

    @staticmethod
    def get_risk_distribution(db: Session) -> Dict[str, int]:
        """Count of evaluated transactions across risk tiers."""
        dist = db.query(Prediction.risk_level, func.count(Prediction.id)).group_by(Prediction.risk_level).all()
        return {r.value: cnt for r, cnt in dist}

    @staticmethod
    def get_related_transactions(db: Session, customer_id: Optional[str] = None, merchant_category: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Correlate related transactions by customer identifier or merchant category."""
        q = db.query(Transaction).order_by(desc(Transaction.timestamp))
        if customer_id:
            q = q.filter(Transaction.customer_id == customer_id)
        if merchant_category:
            q = q.filter(Transaction.merchant_category == merchant_category)
        txns = q.limit(min(limit, 10)).all()
        return [
            {
                "id": t.id,
                "external_id": t.external_transaction_id,
                "customer_id": t.customer_id,
                "amount": float(t.amount),
                "currency": t.currency,
                "merchant": t.merchant_id,
                "category": t.merchant_category,
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            }
            for t in txns
        ]

    @staticmethod
    def get_entity_relationships(db: Session, transaction_id: str) -> Dict[str, Any]:
        """Graph entity relationship topology surrounding a transaction."""
        txn_data = CopilotTools.get_transaction(db, transaction_id)
        if txn_data.get("status") == "NOT_FOUND":
            return txn_data

        cust_id = txn_data.get("customer_id")
        related = []
        if cust_id:
            related = (
                db.query(Transaction)
                .filter(Transaction.customer_id == cust_id)
                .filter(Transaction.id != txn_data["transaction_id"])
                .order_by(desc(Transaction.timestamp))
                .limit(5)
                .all()
            )

        return {
            "focus_transaction": txn_data["external_transaction_id"],
            "customer_id": cust_id,
            "merchant_category": txn_data.get("merchant_category"),
            "location": txn_data.get("location"),
            "connected_events_count": len(related),
            "connected_events": [
                {"id": r.id, "external_id": r.external_transaction_id, "amount": float(r.amount), "merchant": r.merchant_id}
                for r in related
            ],
        }

    @staticmethod
    def get_shap_explanation(db: Session, transaction_id: str) -> Dict[str, Any]:
        """Retrieve local SHAP feature attributions for a given transaction."""
        txn_data = CopilotTools.get_transaction(db, transaction_id)
        if txn_data.get("status") == "NOT_FOUND":
            return txn_data

        txn_id = txn_data["transaction_id"]
        pred = db.query(Prediction).filter(Prediction.transaction_id == txn_id).first()
        if not pred or not pred.explanation_json:
            return {
                "transaction_id": txn_data["external_transaction_id"],
                "status": "EXPLANATION_UNAVAILABLE",
                "message": "SHAP attribution has not been generated or stored for this transaction record.",
            }

        try:
            explanation = json.loads(pred.explanation_json)
        except Exception:
            explanation = {}

        m_ver = pred.model_version.name if hasattr(pred.model_version, "name") else (str(pred.model_version) if pred.model_version else "FraudGuard XGBoost Champion v1.0")
        return {
            "transaction_id": txn_data["external_transaction_id"],
            "model_version": m_ver,
            "risk_score": round(pred.risk_score, 1),
            "fraud_probability": round(pred.fraud_probability, 4),
            "base_value": explanation.get("base_value", 0.05),
            "top_contributing_factors": explanation.get("top_factors", [])[:5],
            "all_features": explanation.get("all_features", []),
        }

TOOL_REGISTRY = {
    "get_transaction": CopilotTools.get_transaction,
    "search_transactions": CopilotTools.search_transactions,
    "get_highest_risk_transactions": CopilotTools.get_highest_risk_transactions,
    "get_alerts": CopilotTools.get_alerts,
    "get_alert_summary": CopilotTools.get_alert_summary,
    "get_investigation": CopilotTools.get_investigation,
    "get_investigation_timeline": CopilotTools.get_investigation_timeline,
    "get_model_information": CopilotTools.get_model_information,
    "get_model_metrics": CopilotTools.get_model_metrics,
    "get_dataset_summary": CopilotTools.get_dataset_summary,
    "get_dashboard_summary": CopilotTools.get_dashboard_summary,
    "get_fraud_trends": CopilotTools.get_fraud_trends,
    "get_risk_distribution": CopilotTools.get_risk_distribution,
    "get_related_transactions": CopilotTools.get_related_transactions,
    "get_entity_relationships": CopilotTools.get_entity_relationships,
    "get_shap_explanation": CopilotTools.get_shap_explanation,
}

def execute_copilot_tool(db: Session, tool_name: str, kwargs: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a registered read-only copilot tool safely."""
    fn = TOOL_REGISTRY.get(tool_name)
    if not fn:
        return {"error": f"Unknown tool '{tool_name}'", "status": "INVALID_TOOL"}
    try:
        return fn(db=db, **kwargs)
    except Exception as e:
        logger.error(f"Error executing copilot tool '{tool_name}': {e}", exc_info=True)
        return {"error": str(e), "status": "EXECUTION_ERROR"}

def get_copilot_tool_definitions() -> List[Dict[str, Any]]:
    """Return complete tool schemas for all 16 read-only tools."""
    return [
        {
            "name": "get_transaction",
            "description": "Look up full transaction dossier, fraud scores, and behavioral flags by transaction ID or external ID.",
            "parameters": {"type": "object", "properties": {"transaction_id": {"type": "string"}}, "required": ["transaction_id"]},
        },
        {
            "name": "search_transactions",
            "description": "Search transactions by query string, customer ID, merchant, location, or risk level tier.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "risk_level": {"type": "string"}, "limit": {"type": "integer"}}},
        },
        {
            "name": "get_highest_risk_transactions",
            "description": "Retrieve recent transactions with the highest computed risk scores and fraud probabilities.",
            "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}},
        },
        {
            "name": "get_alerts",
            "description": "List fraud alerts filtered optionally by status (NEW, UNDER_REVIEW, RESOLVED, FALSE_POSITIVE).",
            "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}, "status": {"type": "string"}}},
        },
        {
            "name": "get_alert_summary",
            "description": "Retrieve aggregate alert queue counts grouped by severity (CRITICAL, HIGH) and triage status.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_investigation",
            "description": "Retrieve formal investigation case details, priority, attached transactions, and analyst notes by case ID.",
            "parameters": {"type": "object", "properties": {"case_id": {"type": "integer"}}, "required": ["case_id"]},
        },
        {
            "name": "get_investigation_timeline",
            "description": "Retrieve chronological audit history and investigative notes for a specific case ID.",
            "parameters": {"type": "object", "properties": {"case_id": {"type": "integer"}}, "required": ["case_id"]},
        },
        {
            "name": "get_model_information",
            "description": "Retrieve architecture, algorithm, status, and optimal threshold for the active champion model.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_model_metrics",
            "description": "Retrieve quantitative evaluation benchmarks (Precision, Recall, F1, PR-AUC, ROC-AUC) for the active model.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_dataset_summary",
            "description": "Retrieve statistics on registered training/validation datasets and overall fraud prevalence.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_dashboard_summary",
            "description": "Retrieve high-level executive financial risk KPIs (monitored volume, fraud rate, open cases).",
            "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
        },
        {
            "name": "get_fraud_trends",
            "description": "Retrieve daily transaction volume and fraud count trends over the past N days.",
            "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}},
        },
        {
            "name": "get_risk_distribution",
            "description": "Retrieve count of scored transactions distributed across risk tiers (LOW, MEDIUM, HIGH, CRITICAL).",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_related_transactions",
            "description": "Correlate related transactions by customer ID or merchant category.",
            "parameters": {"type": "object", "properties": {"customer_id": {"type": "string"}, "merchant_category": {"type": "string"}, "limit": {"type": "integer"}}},
        },
        {
            "name": "get_entity_relationships",
            "description": "Analyze network entity graph topology connecting a transaction with customer account activity.",
            "parameters": {"type": "object", "properties": {"transaction_id": {"type": "string"}}, "required": ["transaction_id"]},
        },
        {
            "name": "get_shap_explanation",
            "description": "Retrieve local SHAP feature attributions and top contributing risk factors for a transaction.",
            "parameters": {"type": "object", "properties": {"transaction_id": {"type": "string"}}, "required": ["transaction_id"]},
        },
    ]

