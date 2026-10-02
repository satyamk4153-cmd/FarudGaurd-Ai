from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.alert import FraudAlert, AlertStatus
from backend.app.models.transaction import Transaction
from backend.app.models.audit import AuditLog
from backend.app.schemas.alerts import AlertResponse, AlertListResponse, AlertUpdateRequest
from backend.app.schemas.transactions import TransactionResponse, PredictionSummary

class AlertService:
    @staticmethod
    def _to_response(a: FraudAlert) -> AlertResponse:
        txn_resp = None
        risk_score = 75.0
        if a.transaction:
            p_summary = None
            if a.transaction.prediction:
                risk_score = a.transaction.prediction.risk_score
                p_summary = PredictionSummary(
                    fraud_probability=a.transaction.prediction.fraud_probability,
                    risk_score=a.transaction.prediction.risk_score,
                    risk_level=a.transaction.prediction.risk_level,
                    prediction=a.transaction.prediction.prediction,
                    anomaly_score=a.transaction.prediction.anomaly_score,
                )
            txn_resp = TransactionResponse(
                id=a.transaction.id,
                external_transaction_id=a.transaction.external_transaction_id,
                customer_id=a.transaction.customer_id,
                card_id=a.transaction.card_id,
                amount=a.transaction.amount,
                currency=a.transaction.currency,
                transaction_type=a.transaction.transaction_type,
                merchant_id=a.transaction.merchant_id,
                merchant_category=a.transaction.merchant_category,
                location=a.transaction.location,
                country=a.transaction.country,
                device_id=a.transaction.device_id,
                ip_address=a.transaction.ip_address,
                channel=a.transaction.channel,
                timestamp=a.transaction.timestamp,
                account_age_days=a.transaction.account_age_days,
                transaction_frequency=a.transaction.transaction_frequency,
                previous_transaction_amount=a.transaction.previous_transaction_amount,
                balance_before=a.transaction.balance_before,
                balance_after=a.transaction.balance_after,
                distance_from_previous_transaction=a.transaction.distance_from_previous_transaction,
                ip_risk=a.transaction.ip_risk,
                device_risk=a.transaction.device_risk,
                is_fraud=a.transaction.is_fraud,
                prediction=p_summary,
            )

        return AlertResponse(
            id=a.id,
            alert_id=f"ALT-{a.id:05d}",
            transaction_id=a.transaction_id,
            severity=a.severity,
            status=a.status,
            alert_reason=a.alert_reason,
            rule_triggered=a.alert_reason,
            risk_score=risk_score,
            reviewed_by=a.reviewed_by,
            reviewed_at=a.reviewed_at,
            resolved_at=a.reviewed_at if a.status in [AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE] else None,
            created_at=a.created_at,
            transaction=txn_resp,
        )

    @staticmethod
    def list_alerts(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
    ) -> AlertListResponse:
        """Paginated alerts listing with filtering."""
        query = db.query(FraudAlert).join(Transaction, Transaction.id == FraudAlert.transaction_id)

        if status and status.upper() != "ALL":
            query = query.filter(FraudAlert.status == status.upper())

        if severity and severity.upper() != "ALL":
            query = query.filter(FraudAlert.severity == severity.upper())

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                (FraudAlert.alert_reason.ilike(pattern)) |
                (Transaction.external_transaction_id.ilike(pattern)) |
                (Transaction.customer_id.ilike(pattern))
            )

        total = query.count()
        query = query.order_by(desc(FraudAlert.created_at))

        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        alert_responses = [AlertService._to_response(a) for a in items]
        total_pages = max(1, (total + page_size - 1) // page_size)
        return AlertListResponse(
            items=alert_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_alert_detail(db: Session, alert_id: int) -> Optional[AlertResponse]:
        """Fetch alert detail by ID."""
        alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
        if not alert:
            return None
        return AlertService._to_response(alert)

    @staticmethod
    def update_alert(
        db: Session,
        alert_id: int,
        req: AlertUpdateRequest,
        user_id: int,
    ) -> Optional[AlertResponse]:
        """Update alert status (UNDER_REVIEW, RESOLVED, FALSE_POSITIVE) and audit action."""
        alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
        if not alert:
            return None

        old_status = alert.status.value
        alert.status = req.status
        alert.reviewed_by = user_id
        alert.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)

        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="ALERT_STATUS_UPDATE",
            resource="FraudAlert",
            resource_id=str(alert.id),
            details_json=f'{{"old_status": "{old_status}", "new_status": "{req.status.value}", "notes": "{req.notes or ""}"}}',
        )
        db.add(audit)
        db.commit()

        return AlertService._to_response(alert)
