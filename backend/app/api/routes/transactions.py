from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.schemas.transactions import (
    TransactionCreateRequest,
    TransactionResponse,
    TransactionDetailResponse,
    TransactionListResponse,
)
from backend.app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=TransactionListResponse)
def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    prediction: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    merchant_category: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    sort_by: str = Query("timestamp"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List transactions with server-side pagination, search, and multidimensional filtering."""
    return TransactionService.list_transactions(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        risk_level=risk_level,
        prediction=prediction,
        transaction_type=transaction_type,
        merchant_category=merchant_category,
        min_amount=min_amount,
        max_amount=max_amount,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

@router.get("/export/csv")
def export_transactions_csv(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    prediction: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    merchant_category: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export filtered transaction records as sanitized CSV."""
    from fastapi.responses import Response
    import csv
    import io

    res = TransactionService.list_transactions(
        db=db,
        page=1,
        page_size=2000,
        search=search,
        risk_level=risk_level,
        prediction=prediction,
        transaction_type=transaction_type,
        merchant_category=merchant_category,
        min_amount=min_amount,
        max_amount=max_amount,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "transaction_id", "timestamp", "user_id", "amount", "currency",
        "type", "merchant_category", "location", "risk_score", "risk_level",
        "decision", "anomaly_score", "fraud_probability"
    ])

    for item in res.items:
        score = item.prediction.risk_score if item.prediction else 0.0
        r_level = item.prediction.risk_level if item.prediction else "LOW"
        pred = item.prediction.prediction if item.prediction else "Legitimate"
        prob = item.prediction.fraud_probability if item.prediction else 0.0
        anom = item.prediction.anomaly_score if item.prediction else 0.0
        dec = "BLOCK" if score >= 75 else ("REVIEW" if score > 30 else "APPROVE")

        # Sanitize string fields against formula injection
        def sanitize(val):
            s = str(val or "")
            return f"'{s}" if s.startswith(("=", "+", "-", "@")) else s

        writer.writerow([
            sanitize(item.external_transaction_id),
            sanitize(item.timestamp.isoformat() if item.timestamp else ""),
            sanitize(item.customer_id),
            f"{item.amount:.2f}",
            item.currency,
            sanitize(item.transaction_type),
            sanitize(item.merchant_category),
            sanitize(item.location),
            f"{score:.1f}",
            r_level,
            dec,
            f"{anom:.4f}",
            f"{prob:.4f}",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fraudguard_transactions.csv"}
    )

@router.get("/{txn_id}", response_model=TransactionDetailResponse)
def get_transaction_detail(
    txn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full transaction details, SHAP feature attributions, and related activities."""
    detail = TransactionService.get_transaction_detail(db, txn_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID {txn_id} not found.",
        )
    return detail

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    req: TransactionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingest a new transaction into the platform."""
    txn_count = db.query(Transaction).count() + 1
    ext_id = f"TXN-{txn_count:07d}"

    txn = Transaction(
        external_transaction_id=ext_id,
        customer_id=req.customer_id or f"CUST-{current_user.id:05d}",
        card_id=req.card_id or "CARD-USER",
        amount=req.amount,
        currency=req.currency or "INR",
        transaction_type=req.transaction_type.upper(),
        merchant_id=req.merchant_id or "MERCH-ONLINE",
        merchant_category=req.merchant_category.upper(),
        location=req.location,
        country=req.country or "IN",
        device_id=req.device_id or "DEV-CLIENT",
        ip_address=req.ip_address or "127.0.0.1",
        channel=req.channel or "ONLINE",
        timestamp=req.timestamp or datetime.now(timezone.utc),
        account_age_days=req.account_age_days or 30,
        transaction_frequency=req.transaction_frequency or 1,
        previous_transaction_amount=req.previous_transaction_amount or 0.0,
        balance_before=req.balance_before or 0.0,
        balance_after=req.balance_after or 0.0,
        distance_from_previous_transaction=req.distance_from_previous_transaction or 0.0,
        ip_risk=req.ip_risk or 0.1,
        device_risk=req.device_risk or 0.1,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return TransactionResponse(
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
        prediction=None,
    )
