import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.db.init_db import init_db
from backend.app.db.session import SessionLocal
from backend.app.api.routes import (
    auth,
    transactions,
    predictions,
    dashboard,
    alerts,
    investigations,
    datasets,
    models,
    monitoring,
    admin,
    copilot,
    jobs,
)
from backend.app.websocket import live
from ml.inference.engine import InferenceEngine

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fraudguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: database initialization and model warm-up."""
    logger.info("Initializing FraudGuard AI backend services...")
    # In development/test mode, initialize DB and ensure demo users exist;
    # in production, verify connectivity without modifying schema or auto-seeding
    if settings.ENVIRONMENT != "production":
        db = SessionLocal()
        try:
            init_db(db)
            from scripts.seed_database import seed_users
            seed_users()
        finally:
            db.close()
    else:
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            logger.info("Production database connection verified.")
        except Exception as e:
            logger.critical(f"CRITICAL: Failed to connect to production database: {e}")
            raise RuntimeError(f"Database connection failed: {e}") from e
        finally:
            db.close()

    # Pre-cache inference models in memory
    logger.info("Pre-warming InferenceEngine artifacts...")
    engine = InferenceEngine.get_instance()
    if engine.is_loaded:
        logger.info(f"InferenceEngine loaded successfully with active model: {engine.active_model.name}")
    else:
        logger.warning("InferenceEngine failed to load one or more artifacts.")

    yield
    logger.info("Shutting down FraudGuard AI backend...")

app = FastAPI(
    title="FraudGuard AI — Financial Fraud Detection & Risk Analytics Platform",
    description="Production-style Explainable AI Financial Fraud Detection, Risk Analytics, Anomaly Detection and Investigation Platform API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import uuid
from backend.app.services.gemini_client import get_gemini_status

# Request Latency, Correlation ID & Security Headers Middleware
@app.middleware("http")
async def add_correlation_id_and_security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if settings.ENVIRONMENT.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system administrators."},
    )

# Health Endpoints
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe."""
    return {"status": "HEALTHY", "app": settings.APP_NAME, "version": "1.0.0"}

@app.get("/ready", tags=["Health"])
def readiness_check():
    """Readiness probe checking database connectivity, ML model availability, Redis, and Gemini."""
    db = SessionLocal()
    db_ok = False
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Readiness DB error: {e}")
    finally:
        db.close()

    engine = InferenceEngine.get_instance()
    model_ok = engine.is_loaded and engine.active_model is not None

    redis_status = "NOT_CONFIGURED"
    if settings.REDIS_URL:
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, socket_timeout=1)
            r.ping()
            redis_status = "CONNECTED"
        except Exception:
            redis_status = "UNAVAILABLE"

    gemini_status = get_gemini_status()

    # Core platform readiness depends strictly on database and ML engine
    all_ready = db_ok and model_ok
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "READY" if all_ready else "DEGRADED",
            "database": "CONNECTED" if db_ok else "UNAVAILABLE",
            "model_engine": "LOADED" if model_ok else "UNAVAILABLE",
            "active_model": engine.active_model.name if model_ok else "NONE",
            "redis": redis_status,
            "gemini": gemini_status,
        },
    )

# Include API Routers under /api
api_prefix = settings.API_V1_STR  # "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(transactions.router, prefix=api_prefix)
app.include_router(predictions.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(investigations.router, prefix=api_prefix)
app.include_router(datasets.router, prefix=api_prefix)
app.include_router(models.router, prefix=api_prefix)
app.include_router(monitoring.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(copilot.router, prefix=api_prefix)
app.include_router(jobs.router, prefix=api_prefix)

# Include WebSocket router
app.include_router(live.router)

# Mount Uploads directory for static downloads
uploads_path = Path(settings.UPLOAD_DIRECTORY)
uploads_path.mkdir(exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
