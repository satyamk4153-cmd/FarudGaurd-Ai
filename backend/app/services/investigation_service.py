from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.investigation import InvestigationCase, InvestigationNote, CaseStatus
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.models.audit import AuditLog
from backend.app.schemas.investigations import (
    InvestigationCaseCreate,
    InvestigationCaseUpdate,
    InvestigationCaseResponse,
    InvestigationCaseListResponse,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
)
from backend.app.schemas.transactions import TransactionResponse, PredictionSummary

class InvestigationService:
    @staticmethod
    def list_cases(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> InvestigationCaseListResponse:
        """List investigation cases with filtering."""
        query = db.query(InvestigationCase).join(Transaction, Transaction.id == InvestigationCase.transaction_id)

        if status and status.upper() != "ALL":
            query = query.filter(InvestigationCase.status == status.upper())

        if priority and priority.upper() != "ALL":
            query = query.filter(InvestigationCase.priority == priority.upper())

        total = query.count()
        query = query.order_by(desc(InvestigationCase.opened_at))

        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        case_responses = []
        for c in items:
            txn_resp = None
            if c.transaction:
                p_summary = None
                if c.transaction.prediction:
                    p_summary = PredictionSummary(
                        fraud_probability=c.transaction.prediction.fraud_probability,
                        risk_score=c.transaction.prediction.risk_score,
                        risk_level=c.transaction.prediction.risk_level,
                        prediction=c.transaction.prediction.prediction,
                        anomaly_score=c.transaction.prediction.anomaly_score,
                    )
                txn_resp = TransactionResponse(
                    id=c.transaction.id,
                    external_transaction_id=c.transaction.external_transaction_id,
                    customer_id=c.transaction.customer_id,
                    card_id=c.transaction.card_id,
                    amount=c.transaction.amount,
                    currency=c.transaction.currency,
                    transaction_type=c.transaction.transaction_type,
                    merchant_id=c.transaction.merchant_id,
                    merchant_category=c.transaction.merchant_category,
                    location=c.transaction.location,
                    country=c.transaction.country,
                    device_id=c.transaction.device_id,
                    ip_address=c.transaction.ip_address,
                    channel=c.transaction.channel,
                    timestamp=c.transaction.timestamp,
                    account_age_days=c.transaction.account_age_days,
                    transaction_frequency=c.transaction.transaction_frequency,
                    previous_transaction_amount=c.transaction.previous_transaction_amount,
                    balance_before=c.transaction.balance_before,
                    balance_after=c.transaction.balance_after,
                    distance_from_previous_transaction=c.transaction.distance_from_previous_transaction,
                    ip_risk=c.transaction.ip_risk,
                    device_risk=c.transaction.device_risk,
                    is_fraud=c.transaction.is_fraud,
                    prediction=p_summary,
                )

            assignee_name = c.assignee.name if c.assignee else "Unassigned"
            amt_at_risk = float(c.transaction.amount) if c.transaction and c.transaction.amount else 0.0
            txn_ids = [str(c.transaction.external_transaction_id or c.transaction.id)] if c.transaction else []

            case_responses.append(
                InvestigationCaseResponse(
                    id=c.id,
                    case_number=c.case_number,
                    transaction_id=c.transaction_id,
                    assigned_to=c.assigned_to,
                    assigned_to_id=c.assigned_to,
                    assignee_name=assignee_name,
                    assigned_to_name=assignee_name,
                    priority=c.priority,
                    status=c.status,
                    summary=c.summary,
                    title=c.summary,
                    description=c.resolution_summary or c.summary,
                    resolution_summary=c.resolution_summary,
                    opened_at=c.opened_at,
                    created_at=c.opened_at,
                    closed_at=c.closed_at,
                    resolved_at=c.closed_at,
                    updated_at=c.updated_at,
                    creator_id=1,
                    creator_name="Security Team",
                    transaction_count=1,
                    total_amount_at_risk=amt_at_risk,
                    transaction_ids=txn_ids,
                    transaction=txn_resp,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)
        return InvestigationCaseListResponse(
            items=case_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_case_detail(db: Session, case_id: int) -> Optional[InvestigationCaseResponse]:
        """Fetch full case dossier with transaction and all analyst notes."""
        c = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not c:
            return None

        txn_resp = None
        if c.transaction:
            p_summary = None
            if c.transaction.prediction:
                p_summary = PredictionSummary(
                    fraud_probability=c.transaction.prediction.fraud_probability,
                    risk_score=c.transaction.prediction.risk_score,
                    risk_level=c.transaction.prediction.risk_level,
                    prediction=c.transaction.prediction.prediction,
                    anomaly_score=c.transaction.prediction.anomaly_score,
                )
            txn_resp = TransactionResponse(
                id=c.transaction.id,
                external_transaction_id=c.transaction.external_transaction_id,
                customer_id=c.transaction.customer_id,
                card_id=c.transaction.card_id,
                amount=c.transaction.amount,
                currency=c.transaction.currency,
                transaction_type=c.transaction.transaction_type,
                merchant_id=c.transaction.merchant_id,
                merchant_category=c.transaction.merchant_category,
                location=c.transaction.location,
                country=c.transaction.country,
                device_id=c.transaction.device_id,
                ip_address=c.transaction.ip_address,
                channel=c.transaction.channel,
                timestamp=c.transaction.timestamp,
                account_age_days=c.transaction.account_age_days,
                transaction_frequency=c.transaction.transaction_frequency,
                previous_transaction_amount=c.transaction.previous_transaction_amount,
                balance_before=c.transaction.balance_before,
                balance_after=c.transaction.balance_after,
                distance_from_previous_transaction=c.transaction.distance_from_previous_transaction,
                ip_risk=c.transaction.ip_risk,
                device_risk=c.transaction.device_risk,
                is_fraud=c.transaction.is_fraud,
                prediction=p_summary,
            )

        notes_resp = [
            InvestigationNoteResponse(
                id=n.id,
                case_id=n.case_id,
                user_id=n.user_id,
                author_id=n.user_id,
                author_name=n.author.name if n.author else "Analyst",
                note=n.note,
                is_automated=False,
                created_at=n.created_at,
            )
            for n in c.notes
        ]

        assignee_name = c.assignee.name if c.assignee else "Unassigned"
        amt_at_risk = float(c.transaction.amount) if c.transaction and c.transaction.amount else 0.0
        txn_ids = [str(c.transaction.external_transaction_id or c.transaction.id)] if c.transaction else []

        return InvestigationCaseResponse(
            id=c.id,
            case_number=c.case_number,
            transaction_id=c.transaction_id,
            assigned_to=c.assigned_to,
            assigned_to_id=c.assigned_to,
            assignee_name=assignee_name,
            assigned_to_name=assignee_name,
            priority=c.priority,
            status=c.status,
            summary=c.summary,
            title=c.summary,
            description=c.resolution_summary or c.summary,
            resolution_summary=c.resolution_summary,
            opened_at=c.opened_at,
            created_at=c.opened_at,
            closed_at=c.closed_at,
            resolved_at=c.closed_at,
            updated_at=c.updated_at,
            creator_id=1,
            creator_name="Security Team",
            transaction_count=1,
            total_amount_at_risk=amt_at_risk,
            transaction_ids=txn_ids,
            transaction=txn_resp,
            notes=notes_resp,
        )

    @staticmethod
    def create_case(db: Session, req: InvestigationCaseCreate, user_id: int) -> InvestigationCase:
        """Create a new investigation case with resilient transaction resolution."""
        target_txn_id = req.transaction_id
        if not target_txn_id and req.transaction_ids:
            first_raw = req.transaction_ids[0]
            if isinstance(first_raw, int) or (isinstance(first_raw, str) and first_raw.isdigit()):
                t_obj = db.query(Transaction).filter(Transaction.id == int(first_raw)).first()
            else:
                t_obj = db.query(Transaction).filter(Transaction.external_transaction_id == str(first_raw)).first()
            if t_obj:
                target_txn_id = t_obj.id

        if not target_txn_id:
            latest_txn = db.query(Transaction).order_by(Transaction.id.desc()).first()
            if latest_txn:
                target_txn_id = latest_txn.id
            else:
                raise ValueError("A valid transaction is required to open an investigation case.")

        # If a case already exists for this transaction, return it cleanly
        existing = db.query(InvestigationCase).filter(InvestigationCase.transaction_id == target_txn_id).first()
        if existing:
            return existing

        case_count = db.query(InvestigationCase).count() + 1
        case_num = f"CASE-2026-{case_count:04d}"

        case_obj = InvestigationCase(
            case_number=case_num,
            transaction_id=target_txn_id,
            assigned_to=req.assigned_to or user_id,
            priority=req.priority,
            status=CaseStatus.OPEN,
            summary=req.summary,
            opened_at=datetime.now(timezone.utc),
        )
        db.add(case_obj)
        db.commit()
        db.refresh(case_obj)

        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="CASE_CREATED",
            resource="InvestigationCase",
            resource_id=str(case_obj.id),
            details_json=f'{{"case_number": "{case_num}", "transaction_id": {target_txn_id}}}',
        )
        db.add(audit)
        db.commit()

        return case_obj

    @staticmethod
    def update_case(db: Session, case_id: int, req: InvestigationCaseUpdate, user_id: int) -> Optional[InvestigationCase]:
        """Update case status, priority, or resolution summary."""
        c = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not c:
            return None

        if req.status is not None:
            c.status = req.status
            if req.status in [CaseStatus.RESOLVED, CaseStatus.FALSE_POSITIVE]:
                c.closed_at = datetime.now(timezone.utc)
            else:
                c.closed_at = None

        if req.priority is not None:
            c.priority = req.priority

        if req.assigned_to is not None:
            c.assigned_to = req.assigned_to

        if req.resolution_summary is not None:
            c.resolution_summary = req.resolution_summary

        c.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(c)

        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="CASE_UPDATED",
            resource="InvestigationCase",
            resource_id=str(c.id),
            details_json=f'{{"status": "{c.status.value}", "priority": "{c.priority.value}"}}',
        )
        db.add(audit)
        db.commit()

        return c

    @staticmethod
    def add_note(db: Session, case_id: int, note_text: str, user_id: int) -> Optional[InvestigationNote]:
        """Add an analyst note to an active investigation case."""
        c = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not c:
            return None

        note = InvestigationNote(
            case_id=case_id,
            user_id=user_id,
            note=note_text.strip(),
            created_at=datetime.now(timezone.utc),
        )
        db.add(note)
        c.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(note)
        return note

        return note
