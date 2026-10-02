import sys
import os
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.db.session import SessionLocal
from backend.app.db.init_db import init_db
from backend.app.models.user import User, UserRole
from backend.app.security.password import hash_password
from backend.app.models.audit import AuditLog

DEMO_USERS = [
    {
        "name": "Sarah Connor (Admin)",
        "email": "admin@fraudguard.ai",
        "password": "Admin@123456",
        "role": UserRole.ADMIN,
    },
    {
        "name": "Alex Mercer (Senior Analyst)",
        "email": "analyst@fraudguard.ai",
        "password": "Analyst@123456",
        "role": UserRole.ANALYST,
    },
    {
        "name": "David Miller (Standard User)",
        "email": "user@fraudguard.ai",
        "password": "User@123456",
        "role": UserRole.USER,
    },
]

def seed_users():
    db = SessionLocal()
    init_db(db)
    print("Seeding initial users...")
    
    created_count = 0
    for u in DEMO_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_count += 1
            print(f"Created {u['role'].value} user: {u['email']} (Password: {u['password']})")
        else:
            print(f"User {u['email']} already exists.")
            
    db.close()
    print(f"Seeding completed. ({created_count} users created)")

if __name__ == "__main__":
    seed_users()
