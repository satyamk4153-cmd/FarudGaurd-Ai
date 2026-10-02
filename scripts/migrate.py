#!/usr/bin/env python3
"""
Explicit Alembic Migration Script for FraudGuard AI.
Upgrades database schema to head revision and fails loudly on any error.
"""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from alembic.config import Config
from alembic import command

def run():
    print("=" * 60)
    print("FraudGuard AI — Database Migration Runner")
    print("=" * 60)
    alembic_ini = BASE_DIR / "alembic.ini"
    if not alembic_ini.exists():
        print(f"ERROR: Configuration file not found at {alembic_ini}", file=sys.stderr)
        sys.exit(1)

    try:
        cfg = Config(str(alembic_ini))
        print("Executing: alembic upgrade head...")
        command.upgrade(cfg, "head")
        print("SUCCESS: All database schema migrations successfully applied to head.")
    except Exception as exc:
        print(f"CRITICAL MIGRATION FAILURE: {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    run()
