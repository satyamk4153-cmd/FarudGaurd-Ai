from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.models.prediction import RiskLevel
from backend.app.models.alert import AlertStatus
from backend.app.schemas.transactions import TransactionResponse

class AlertUpdateRequest(BaseModel):
    status: AlertStatus
    notes: Optional[str] = None

class AlertResponse(BaseModel):
    id: int
    transaction_id: int
    severity: RiskLevel
    status: AlertStatus
    alert_reason: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    transaction: Optional[TransactionResponse] = None

    # UI compatibility aliases
    alert_id: Optional[str] = None
    rule_triggered: Optional[str] = None
    risk_score: Optional[float] = None
    notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
