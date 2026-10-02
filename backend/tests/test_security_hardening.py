import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.user import User, UserRole
from backend.app.db.session import SessionLocal
from backend.app.security.jwt import create_access_token

client = TestClient(app)

def get_auth_token(email: str, role: str = "ANALYST") -> str:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            from backend.app.security.password import hash_password
            user = User(
                name=f"Test {role}",
                email=email,
                password_hash=hash_password("Password123!"),
                role=UserRole(role),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    finally:
        db.close()

def test_unauthenticated_batch_download_rejected():
    """Verify that unauthenticated users cannot download batch CSV results."""
    res = client.get("/api/predict/batch/job-12345/download")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

def test_batch_download_path_traversal_rejected():
    """Verify that path traversal in job_id is rejected with 400 Bad Request."""
    token = get_auth_token("admin@fraudguard.ai", role="ADMIN")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Path traversal attempt
    res = client.get("/api/predict/batch/..%2f..%2fetc/download", headers=headers)
    assert res.status_code in [400, 404]

def test_query_param_token_authentication():
    """Verify that valid JWT in ?token= query parameter successfully authenticates requests."""
    token = get_auth_token("admin@fraudguard.ai", role="ADMIN")
    res = client.get(f"/api/admin/statistics?token={token}")
    assert res.status_code == 200
    assert "total_users" in res.json()

def test_role_based_access_control_admin_routes():
    """Verify that standard USER role cannot access admin endpoints."""
    user_token = get_auth_token("standard_user@fraudguard.ai", role="USER")
    headers = {"Authorization": f"Bearer {user_token}"}
    
    res = client.get("/api/admin/users", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

def test_role_based_access_control_dataset_routes():
    """Verify that standard USER role cannot access dataset management endpoints."""
    user_token = get_auth_token("standard_user2@fraudguard.ai", role="USER")
    headers = {"Authorization": f"Bearer {user_token}"}
    
    res = client.get("/api/datasets", headers=headers)
    assert res.status_code == 403

def test_admin_cannot_demote_self():
    """Verify that an administrator cannot demote their own account to prevent lockout."""
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        assert admin_user is not None
        admin_id = admin_user.id
        token = create_access_token(data={"sub": str(admin_id), "email": admin_user.email, "role": "ADMIN"})
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(f"/api/admin/users/{admin_id}/role", json={"role": "USER"}, headers=headers)
    assert res.status_code == 400
    assert "lockout" in res.json()["detail"].lower()

def test_admin_cannot_deactivate_self():
    """Verify that an administrator cannot deactivate their own account."""
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        admin_id = admin_user.id
        token = create_access_token(data={"sub": str(admin_id), "email": admin_user.email, "role": "ADMIN"})
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(f"/api/admin/users/{admin_id}/status", json={"is_active": False}, headers=headers)
    assert res.status_code == 400
    assert "cannot deactivate their own account" in res.json()["detail"].lower()

def test_add_case_note_on_nonexistent_case_returns_404():
    """Verify that appending a note to a non-existent case returns 404 rather than creating orphaned notes."""
    token = get_auth_token("analyst@fraudguard.ai", role="ANALYST")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/investigations/999999/notes", json={"note": "Test orphaned note prevention"}, headers=headers)
    assert res.status_code == 404
