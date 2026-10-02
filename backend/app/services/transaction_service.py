import json
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction, RiskLevel, PredictionLabel
from backend.app.schemas.transactions import (
    TransactionResponse,
    TransactionDetailResponse,
    TransactionListResponse,
    PredictionSummary,
)

class TransactionService:
    @staticmethod
    def list_transactions(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        risk_level: Optional[str] = None,
        prediction: Optional[str] = None,
        transaction_type: Optional[str] = None,
        merchant_category: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        sort_by: str = "timestamp",
        sort_dir: str = "desc",
    ) -> TransactionListResponse:
        """Paginated server-side search and filtering for transaction explorer."""
        query = db.query(Transaction).outerjoin(Prediction, Prediction.transaction_id == Transaction.id)

        # 1. Search Query
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Transaction.external_transaction_id.ilike(s),
                    Transaction.customer_id.ilike(s),
                    Transaction.merchant_id.ilike(s),
                    Transaction.location.ilike(s),
                    Transaction.device_id.ilike(s),
                )
            )

        # 2. Risk Level Filter
        if risk_level and risk_level.upper() != "ALL":
            query = query.filter(Prediction.risk_level == risk_level.upper())

        # 3. Prediction Filter
        if prediction and prediction.upper() != "ALL":
            query = query.filter(Prediction.prediction == prediction)

        # 4. Type & Category
        if transaction_type and transaction_type.upper() != "ALL":
            query = query.filter(Transaction.transaction_type == transaction_type.upper())

        if merchant_category and merchant_category.upper() != "ALL":
            query = query.filter(Transaction.merchant_category == merchant_category.upper())

        # 5. Amount Range
        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
        if max_amount is not None:
            query = query.filter(Transaction.amount <= max_amount)

        # Total count for pagination
        total = query.count()

        # 6. Sorting
        sort_attr = getattr(Transaction, sort_by, Transaction.timestamp)
        if sort_dir.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        # 7. Pagination
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        response_items = []
        for txn in items:
            pred_summary = None
            if txn.prediction:
                pred_summary = PredictionSummary(
                    fraud_probability=txn.prediction.fraud_probability,
                    risk_score=txn.prediction.risk_score,
                    risk_level=txn.prediction.risk_level,
                    prediction=txn.prediction.prediction,
                    anomaly_score=txn.prediction.anomaly_score,
                )
            
            resp = TransactionResponse(
                id=txn.id,
                external_transaction_id=txn.external_transaction_id,
                customer_id=txn.customer_id,
                card_id=txn.card_id,
                amount=txn.amount,
                currency=txn.currency,
                transaction_type=txn.transaction_type,
                merchant_id=txn.merchant_id,
                merchant_category=txn.merchant_category,
                location=txn.location,
                country=txn.country,
                device_id=txn.device_id,
                ip_address=txn.ip_address,
                channel=txn.channel,
                timestamp=txn.timestamp,
                account_age_days=txn.account_age_days,
                transaction_frequency=txn.transaction_frequency,
                previous_transaction_amount=txn.previous_transaction_amount,
                balance_before=txn.balance_before,
                balance_after=txn.balance_after,
                distance_from_previous_transaction=txn.distance_from_previous_transaction,
                ip_risk=txn.ip_risk,
                device_risk=txn.device_risk,
                is_fraud=txn.is_fraud,
                prediction=pred_summary,
            )
            response_items.append(resp)

        total_pages = max(1, (total + page_size - 1) // page_size)
        return TransactionListResponse(
            items=response_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_transaction_detail(db: Session, txn_id: Any) -> Optional[TransactionDetailResponse]:
        """Fetch complete transaction dossier including SHAP factors and related transactions."""
        s_id = str(txn_id).strip()
        if s_id.isdigit():
            txn = db.query(Transaction).filter(
                or_(Transaction.id == int(s_id), Transaction.external_transaction_id == s_id)
            ).first()
        else:
            txn = db.query(Transaction).filter(Transaction.external_transaction_id == s_id).first()

        if not txn:
            return None

        pred_summary = None
        explanation_data = None
        rules_data = []

        if txn.prediction:
            pred_summary = PredictionSummary(
                fraud_probability=txn.prediction.fraud_probability,
                risk_score=txn.prediction.risk_score,
                risk_level=txn.prediction.risk_level,
                prediction=txn.prediction.prediction,
                anomaly_score=txn.prediction.anomaly_score,
            )
            if txn.prediction.explanation_json:
                try:
                    explanation_data = json.loads(txn.prediction.explanation_json)
                except Exception:
                    pass
            if txn.prediction.rule_flags_json:
                try:
                    rules_data = json.loads(txn.prediction.rule_flags_json)
                except Exception:
                    pass

        # Related transactions by same customer or same device
        related = (
            db.query(Transaction)
            .filter(
                Transaction.id != txn.id,
                or_(Transaction.customer_id == txn.customer_id, Transaction.device_id == txn.device_id),
            )
            .order_by(desc(Transaction.timestamp))
            .limit(5)
            .all()
        )

        related_list = []
        for r in related:
            r_pred = None
            if r.prediction:
                r_pred = PredictionSummary(
                    fraud_probability=r.prediction.fraud_probability,
                    risk_score=r.prediction.risk_score,
                    risk_level=r.prediction.risk_level,
                    prediction=r.prediction.prediction,
                    anomaly_score=r.prediction.anomaly_score,
                )
            related_list.append(
                TransactionResponse(
                    id=r.id,
                    external_transaction_id=r.external_transaction_id,
                    customer_id=r.customer_id,
                    card_id=r.card_id,
                    amount=r.amount,
                    currency=r.currency,
                    transaction_type=r.transaction_type,
                    merchant_id=r.merchant_id,
                    merchant_category=r.merchant_category,
                    location=r.location,
                    country=r.country,
                    device_id=r.device_id,
                    ip_address=r.ip_address,
                    channel=r.channel,
                    timestamp=r.timestamp,
                    account_age_days=r.account_age_days,
                    transaction_frequency=r.transaction_frequency,
                    previous_transaction_amount=r.previous_transaction_amount,
                    balance_before=r.balance_before,
                    balance_after=r.balance_after,
                    distance_from_previous_transaction=r.distance_from_previous_transaction,
                    ip_risk=r.ip_risk,
                    device_risk=r.device_risk,
                    is_fraud=r.is_fraud,
                    prediction=r_pred,
                )
            )

        return TransactionDetailResponse(
            id=txn.id,
            external_transaction_id=txn.external_transaction_id,
            customer_id=txn.customer_id,
            card_id=txn.card_id,
            amount=txn.amount,
            currency=txn.currency,
            transaction_type=txn.transaction_type,
            merchant_id=txn.merchant_id,
            merchant_category=txn.merchant_category,
            location=txn.location,
            country=txn.country,
            device_id=txn.device_id,
            ip_address=txn.ip_address,
            channel=txn.channel,
            timestamp=txn.timestamp,
            account_age_days=txn.account_age_days,
            transaction_frequency=txn.transaction_frequency,
            previous_transaction_amount=txn.previous_transaction_amount,
            balance_before=txn.balance_before,
            balance_after=txn.balance_after,
            distance_from_previous_transaction=txn.distance_from_previous_transaction,
            ip_risk=txn.ip_risk,
            device_risk=txn.device_risk,
            is_fraud=txn.is_fraud,
            prediction=pred_summary,
            explanation=explanation_data,
            triggered_rules=rules_data,
            related_transactions=related_list,
        )
