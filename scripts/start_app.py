#!/usr/bin/env python3
"""
Explicit Application Startup Script for FraudGuard AI.
Launches the FastAPI production ASGI server using Uvicorn.
"""
import sys
import os
from pathlib import Path
import uvicorn

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.core.config import settings

def start():
    print("=" * 60)
    print("FraudGuard AI — Application Server Startup")
    print(f"Environment : {settings.ENVIRONMENT}")
    print(f"Server Host : {settings.HOST}")
    print(f"Server Port : {settings.PORT}")
    print("=" * 60)

    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=(settings.ENVIRONMENT == "development"),
        log_level="info",
    )

if __name__ == "__main__":
    start()
