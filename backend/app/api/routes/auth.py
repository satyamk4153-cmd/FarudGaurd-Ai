from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.audit import AuditLog
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.security.password import hash_password, verify_password
from backend.app.security.jwt import create_access_token
from backend.app.api.dependencies.auth import get_current_user
from backend.app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )
    
    # Hash password securely
    hashed = hash_password(req.password)
    
    new_user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        password_hash=hashed,
        role=UserRole.USER,  # Security enforcement: all public registrations are standard USER role
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Record audit log
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTER",
        resource="User",
        resource_id=str(new_user.id),
        details_json=f'{{"email": "{new_user.email}", "role": "{new_user.role.value}"}}',
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return new_user

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email and password and return access token."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(req.password, user.password_hash):
        # Audit failed login attempt
        audit = AuditLog(
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            resource="User",
            resource_id=req.email.lower(),
            details_json='{"status": "invalid_credentials"}',
            ip_address=client_ip,
        )
        db.add(audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your system administrator.",
        )
    
    expires_in_seconds = settings.JWT_EXPIRE_MINUTES * 60
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )

    # Audit successful login
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        resource="User",
        resource_id=str(user.id),
        details_json=f'{{"role": "{user.role.value}"}}',
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details of currently logged-in user."""
    return current_user

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh JWT access token for active session."""
    expires_in_seconds = settings.JWT_EXPIRE_MINUTES * 60
    access_token = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "role": current_user.role.value},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
        user=UserResponse.model_validate(current_user),
    )
