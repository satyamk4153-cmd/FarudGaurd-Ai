from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from backend.app.models.prediction import RiskLevel, PredictionLabel

class TransactionCreateRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in currency")
    currency: Optional[str] = "INR"
    transaction_type: str = Field(..., description="PAYMENT, TRANSFER, CASH_OUT, DEBIT, ONLINE_PURCHASE")
    merchant_category: str = Field(..., description="GROCERY, RETAIL, ELECTRONICS, TRAVEL, GAMBLING, LUXURY, etc.")
    location: str = Field(..., min_length=2, max_length=100)
    country: Optional[str] = "IN"
    channel: Optional[str] = "ONLINE"
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    customer_id: Optional[str] = None
    card_id: Optional[str] = None
    merchant_id: Optional[str] = None
    account_age_days: Optional[int] = 30
    transaction_frequency: Optional[int] = 1
    previous_transaction_amount: Optional[float] = 0.0
    balance_before: Optional[float] = 0.0
    balance_after: Optional[float] = 0.0
    distance_from_previous_transaction: Optional[float] = 0.0
    ip_risk: Optional[float] = 0.1
    device_risk: Optional[float] = 0.1
    timestamp: Optional[datetime] = None

class PredictionSummary(BaseModel):
    fraud_probability: float
    risk_score: float
    risk_level: RiskLevel
    prediction: PredictionLabel
    anomaly_score: float

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: int
    external_transaction_id: str
    customer_id: str
    card_id: Optional[str] = None
    amount: float
    currency: str
    transaction_type: str
    merchant_id: str
    merchant_category: str
    location: str
    country: str
    device_id: str
    ip_address: str
    channel: str
    timestamp: datetime
    account_age_days: int
    transaction_frequency: int
    previous_transaction_amount: float
    balance_before: float
    balance_after: float
    distance_from_previous_transaction: float
    ip_risk: float
    device_risk: float
    is_fraud: Optional[bool] = None
    prediction: Optional[PredictionSummary] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionDetailResponse(TransactionResponse):
    explanation: Optional[Dict[str, Any]] = None
    triggered_rules: Optional[List[str]] = None
    related_transactions: Optional[List[TransactionResponse]] = None

class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
