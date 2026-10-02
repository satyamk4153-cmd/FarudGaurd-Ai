from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_analyst
from backend.app.models.user import User
from backend.app.schemas.alerts import AlertResponse, AlertListResponse, AlertUpdateRequest
from backend.app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Fraud Alerts"])

@router.get("", response_model=AlertListResponse)
def get_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """List fraud alerts with severity, status, and text search filters."""
    return AlertService.list_alerts(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        severity=severity,
        search=search,
    )

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve details for a single fraud alert."""
    alert = AlertService.get_alert_detail(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found.",
        )
    return alert

@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert_status(
    alert_id: int,
    req: AlertUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Update alert triage status (NEW -> UNDER_REVIEW -> RESOLVED / FALSE_POSITIVE)."""
    updated = AlertService.update_alert(
        db=db,
        alert_id=alert_id,
        req=req,
        user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found.",
        )
    return updated
