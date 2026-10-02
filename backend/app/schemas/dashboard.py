from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    total_transactions: int
    potential_fraud: int
    fraud_rate: float
    average_risk_score: float
    critical_alerts: int
    anomalies: int
    under_review: int
    resolved_cases: int
    total_amount: float = 0.0
    amount_at_risk: float = 0.0

class TrendPoint(BaseModel):
    date: str
    total_volume: int
    fraud_count: int
    fraud_rate: float
    avg_risk: float
    total_amount: float = 0.0
    fraud_amount: float = 0.0

class RiskDistributionPoint(BaseModel):
    level: str
    count: int
    percentage: float

class CategoryRiskPoint(BaseModel):
    category: str
    total: int
    fraud_count: int
    fraud_rate: float
    total_amount: float = 0.0
    fraud_amount: float = 0.0

class TypeRiskPoint(BaseModel):
    type: str
    total: int
    fraud_count: int
    fraud_rate: float
    total_amount: float = 0.0
    fraud_amount: float = 0.0

class GeographyPoint(BaseModel):
    location: str
    country: str
    total: int
    fraud_count: int
    fraud_rate: float
    avg_risk: float
    total_amount: float = 0.0
    fraud_amount: float = 0.0

class DashboardTrendsResponse(BaseModel):
    timeframe: str
    trends: List[TrendPoint]
    category_distribution: List[CategoryRiskPoint]
    type_distribution: List[TypeRiskPoint]
