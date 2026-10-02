from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class FeatureDriftItem(BaseModel):
    feature: str
    drift_metric: str = "PSI"
    drift_score: float
    is_drift_detected: bool
    status: str  # NORMAL, WARNING, CRITICAL
    baseline_mean: float
    current_mean: float

class DriftSummaryResponse(BaseModel):
    model_version: str
    features_monitored: int
    features_with_drift: int
    overall_drift_status: str
    items: List[FeatureDriftItem]
    detected_at: datetime

class SystemTelemetryResponse(BaseModel):
    status: str
    uptime_seconds: float
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    database_connected: bool
    model_loaded: bool
    active_model_name: str
    active_model_algorithm: str
    total_predictions_served: int
    avg_inference_latency_ms: float
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    recent_prediction_distribution: Optional[Dict[str, int]] = None
