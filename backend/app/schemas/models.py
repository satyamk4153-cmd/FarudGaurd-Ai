from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from backend.app.models.ml_models import ModelStatus

class ModelEvaluationSummary(BaseModel):
    id: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    pr_auc: float
    precision_at_k: Optional[float] = None
    recall_at_k: Optional[float] = None
    threshold: float
    confusion_matrix: List[List[int]]
    roc_curve: Optional[List[Dict[str, float]]] = None
    pr_curve: Optional[List[Dict[str, float]]] = None

class ModelVersionResponse(BaseModel):
    id: int
    name: str
    algorithm: str
    version: str
    status: ModelStatus
    threshold: float
    artifact_path: str
    created_at: datetime
    updated_at: datetime
    latest_evaluation: Optional[ModelEvaluationSummary] = None

    model_config = ConfigDict(from_attributes=True)

class ModelTrainRequest(BaseModel):
    dataset_id: Optional[int] = None
    algorithms: Optional[List[str]] = ["XGBoost", "RandomForest", "LightGBM", "LogisticRegression"]
    optimize_threshold: Optional[bool] = True

class GlobalFeatureImportanceItem(BaseModel):
    feature: str
    label: str
    importance: float

class ChampionSummaryResponse(BaseModel):
    available: bool
    name: Optional[str] = None
    algorithm: Optional[str] = None
    version: Optional[str] = None
    f1: Optional[float] = None
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
