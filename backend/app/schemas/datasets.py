from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class DatasetResponse(BaseModel):
    id: int
    name: str
    source: str
    description: Optional[str] = None
    filename: str
    row_count: int
    column_count: int
    fraud_count: int
    legitimate_count: int
    fraud_rate: float = 0.0
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DatasetQualityReportResponse(BaseModel):
    dataset_id: int
    name: str
    row_count: int
    column_count: int
    duplicate_count: int
    missing_values: Dict[str, int]
    class_distribution: Dict[str, Any]
    numeric_stats: Dict[str, Any]
    feature_types: Dict[str, str]
