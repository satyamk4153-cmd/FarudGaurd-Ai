from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_admin
from backend.app.models.user import User, UserRole
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction
from backend.app.models.alert import FraudAlert
from backend.app.models.investigation import InvestigationCase
from backend.app.models.ml_models import ModelVersion
from backend.app.models.audit import AuditLog
from backend.app.schemas.auth import UserResponse, UserRoleUpdateRequest, UserStatusUpdateRequest

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = "System"
    user_email: Optional[str] = "system@fraudguard.ai"
    action: str
    resource: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details_json: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_count: int
    analyst_count: int
    user_count: int
    total_audit_logs: int
    database_size_bytes: int
    total_transactions: int
    total_predictions: int
    total_alerts: int
    total_cases: int
    registered_models: int
    system_status: str

@router.get("/statistics", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve high-level system, user distribution, and database size metrics for administrators."""
    import os
    from sqlalchemy import text

    total_u = db.query(User).count()
    active_u = db.query(User).filter(User.is_active == True).count()
    admin_c = db.query(User).filter(User.role == UserRole.ADMIN).count()
    analyst_c = db.query(User).filter(User.role == UserRole.ANALYST).count()
    user_c = db.query(User).filter(User.role == UserRole.USER).count()
    audit_c = db.query(AuditLog).count()

    db_size = 0
    try:
        bind = db.get_bind()
        if bind.dialect.name == "sqlite":
            db_path = bind.url.database
            if db_path and os.path.exists(db_path):
                db_size = os.path.getsize(db_path)
        elif bind.dialect.name == "postgresql":
            db_size = db.execute(text("SELECT pg_database_size(current_database())")).scalar() or 0
    except Exception:
        db_size = 0

    return AdminStatsResponse(
        total_users=total_u,
        active_users=active_u,
        admin_count=admin_c,
        analyst_count=analyst_c,
        user_count=user_c,
        total_audit_logs=audit_c,
        database_size_bytes=db_size,
        total_transactions=db.query(Transaction).count(),
        total_predictions=db.query(Prediction).count(),
        total_alerts=db.query(FraudAlert).count(),
        total_cases=db.query(InvestigationCase).count(),
        registered_models=db.query(ModelVersion).count(),
        system_status="HEALTHY",
    )

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all user accounts in the platform."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    req: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin-only endpoint to promote or demote user roles."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found.")

    if target_user.id == current_user.id and req.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote their own account to prevent administrative lockout.",
        )

    old_role = target_user.role.value
    target_user.role = req.role
    db.commit()
    db.refresh(target_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="USER_ROLE_UPDATED",
        resource="User",
        resource_id=str(target_user.id),
        details_json=f'{{"email": "{target_user.email}", "old_role": "{old_role}", "new_role": "{req.role.value}"}}',
    )
    db.add(audit)
    db.commit()

    return target_user

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    req: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin-only endpoint to activate or deactivate accounts."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == current_user.id and not req.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    target_user.is_active = req.is_active
    db.commit()
    db.refresh(target_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="USER_STATUS_UPDATED",
        resource="User",
        resource_id=str(target_user.id),
        details_json=f'{{"is_active": {req.is_active}}}',
    )
    db.add(audit)
    db.commit()

    return target_user

@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve security and operational audit trail."""
    query = db.query(AuditLog).outerjoin(User, User.id == AuditLog.user_id)

    if action and action.upper() != "ALL":
        query = query.filter(AuditLog.action == action.upper())

    if resource and resource.upper() != "ALL":
        query = query.filter(AuditLog.resource == resource)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(s),
                AuditLog.resource.ilike(s),
                AuditLog.details_json.ilike(s),
                AuditLog.ip_address.ilike(s),
            )
        )

    total = query.count()
    query = query.order_by(desc(AuditLog.timestamp))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    audit_items = [
        AuditLogResponse(
            id=item.id,
            user_id=item.user_id,
            user_name=item.user.name if item.user else "System",
            user_email=item.user.email if item.user else "system@fraudguard.ai",
            action=item.action,
            resource=item.resource,
            resource_type=item.resource,
            resource_id=item.resource_id,
            details_json=item.details_json,
            ip_address=item.ip_address,
            timestamp=item.timestamp,
        )
        for item in items
    ]

    total_pages = max(1, (total + page_size - 1) // page_size)
    return AuditLogListResponse(
        items=audit_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
