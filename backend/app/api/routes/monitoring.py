from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_analyst
from backend.app.models.user import User
from backend.app.schemas.monitoring import (
    DriftSummaryResponse,
    SystemTelemetryResponse,
)
from backend.app.services.monitoring_service import MonitoringService

router = APIRouter(prefix="/monitoring", tags=["Monitoring & Drift"])

@router.get("/drift", response_model=DriftSummaryResponse)
def get_drift_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve statistical feature drift metrics (Population Stability Index - PSI)."""
    return MonitoringService.get_drift_report(db)

@router.get("/system", response_model=SystemTelemetryResponse)
def get_system_telemetry(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve real-time operational telemetry and ML service latency."""
    return MonitoringService.get_system_telemetry(db)
