from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.models.prediction import RiskLevel, PredictionLabel

class PredictRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: Optional[str] = "USD"
    transaction_type: str = Field(..., description="PURCHASE, PAYMENT, TRANSFER, WIRE_TRANSFER, CASH_OUT")
    merchant_category: str = Field(..., description="GROCERY, RETAIL, ELECTRONICS, TRAVEL, GAMBLING, LUXURY, CRYPTO, etc.")
    location: Optional[str] = "New York, USA"
    city: Optional[str] = None
    country: Optional[str] = "USA"
    channel: Optional[str] = "POS"
    device_id: Optional[str] = None
    device_type: Optional[str] = "MOBILE"
    ip_address: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: Optional[str] = None
    card_id: Optional[str] = None
    merchant_id: Optional[str] = None
    account_age_days: Optional[int] = 30
    transaction_frequency: Optional[int] = 1
    velocity_1h: Optional[int] = 1
    velocity_24h: Optional[int] = 3
    previous_transaction_amount: Optional[float] = 0.0
    avg_amount_ratio: Optional[float] = 1.0
    balance_before: Optional[float] = 0.0
    balance_after: Optional[float] = 0.0
    distance_from_previous_transaction: Optional[float] = 0.0
    distance_from_home: Optional[float] = 5.0
    ip_risk: Optional[float] = 0.1
    ip_risk_score: Optional[float] = None
    device_risk: Optional[float] = 0.1
    device_risk_score: Optional[float] = None
    is_international: Optional[bool] = False
    is_first_time_merchant: Optional[bool] = False
    is_failed_attempt_prior: Optional[bool] = False
    timestamp: Optional[datetime] = None

class ShapFactor(BaseModel):
    feature: str
    label: str
    shap_value: float
    actual_value: Any
    impact: str
    percentage_contribution: Optional[float] = 0.0

class ExplanationResponse(BaseModel):
    base_value: float
    top_factors: List[ShapFactor]
    positive_factors: List[ShapFactor]
    negative_factors: List[ShapFactor]

class PredictResponse(BaseModel):
    transaction_id: Optional[int] = None
    external_transaction_id: str
    prediction: str
    decision: str = "APPROVE"
    fraud_probability: float
    risk_score: float
    risk_level: str
    anomaly_score: float
    is_anomaly: bool
    threshold_used: float
    confidence_score: float
    model_name: str
    model_version: str
    algorithm: str
    recommended_review_priority: str
    prediction_time_ms: float
    timing: Optional[Dict[str, float]] = None
    breakdown: Optional[Dict[str, float]] = None
    triggered_rules: List[Any] = []
    top_risk_factors: Optional[List[Dict[str, Any]]] = None
    recommended_actions: Optional[List[str]] = None
    explanation: Optional[ExplanationResponse] = None
    created_at: datetime

class BatchPredictSummary(BaseModel):
    job_id: str
    total_records: int = 0
    processed_records: int = 0
    potential_fraud_count: int = 0
    high_risk_count: int = 0
    critical_risk_count: int = 0
    average_risk_score: float = 0.0
    total_amount_at_risk: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    status: str = "QUEUED"
    progress: int = 0
    download_url: Optional[str] = None
    message: Optional[str] = None
