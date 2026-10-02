import pytest
from backend.app.db.session import SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.security.password import hash_password, verify_password
from backend.app.security.jwt import create_access_token, decode_access_token

def test_password_hashing():
    raw_password = "SecurePassword@2026"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_generation_and_verification():
    payload = {"sub": "42", "email": "test@fraudguard.ai", "role": "ANALYST"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["email"] == "test@fraudguard.ai"
    assert decoded["role"] == "ANALYST"

def test_seeded_users_exist():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@fraudguard.ai").first()
    assert admin is not None
    assert admin.role == UserRole.ADMIN
    assert verify_password("Admin@123456", admin.password_hash) is True

    analyst = db.query(User).filter(User.email == "analyst@fraudguard.ai").first()
    assert analyst is not None
    assert analyst.role == UserRole.ANALYST

    user = db.query(User).filter(User.email == "user@fraudguard.ai").first()
    assert user is not None
    assert user.role == UserRole.USER
    db.close()
