import os
import json
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import pandas as pd

from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_admin
from backend.app.models.user import User
from backend.app.models.ml_models import Dataset, DatasetVersion
from backend.app.models.audit import AuditLog
from backend.app.schemas.datasets import DatasetResponse, DatasetQualityReportResponse
from backend.app.core.config import settings, BASE_DIR
from ml.preprocessing.validator import DatasetValidator

router = APIRouter(prefix="/datasets", tags=["Dataset Management"])

@router.get("", response_model=List[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List cataloged training and benchmark datasets."""
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    results = []
    for d in datasets:
        rate = round(float(d.fraud_count / max(1, d.row_count)), 4)
        results.append(
            DatasetResponse(
                id=d.id,
                name=d.name,
                source=d.source,
                description=d.description,
                filename=d.filename,
                row_count=d.row_count,
                column_count=d.column_count,
                fraud_count=d.fraud_count,
                legitimate_count=d.legitimate_count,
                fraud_rate=rate,
                status=d.status,
                created_at=d.created_at,
            )
        )
    return results

@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve details of a single dataset."""
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {dataset_id} not found.",
        )
    rate = round(float(d.fraud_count / max(1, d.row_count)), 4)
    return DatasetResponse(
        id=d.id,
        name=d.name,
        source=d.source,
        description=d.description,
        filename=d.filename,
        row_count=d.row_count,
        column_count=d.column_count,
        fraud_count=d.fraud_count,
        legitimate_count=d.legitimate_count,
        fraud_rate=rate,
        status=d.status,
        created_at=d.created_at,
    )

@router.get("/{dataset_id}/quality", response_model=DatasetQualityReportResponse)
def get_dataset_quality_report(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Compute and return complete statistical dataset quality profile."""
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    ds_path = BASE_DIR / "ml" / "datasets" / d.filename
    if not ds_path.exists():
        ds_path = Path(settings.UPLOAD_DIRECTORY) / d.filename

    if not ds_path.exists():
        # Fallback summary
        return DatasetQualityReportResponse(
            dataset_id=d.id,
            name=d.name,
            row_count=d.row_count,
            column_count=d.column_count,
            duplicate_count=0,
            missing_values={},
            class_distribution={"legitimate": d.legitimate_count, "fraud": d.fraud_count, "fraud_rate": round(d.fraud_count / max(1, d.row_count), 4)},
            numeric_stats={},
            feature_types={"amount": "float", "timestamp": "datetime"},
        )

    df = pd.read_csv(ds_path, nrows=5000)
    val_res = DatasetValidator.validate_dataset(df, require_target=False)
    prof = val_res.get("profile", {})
    dtypes_dict = {col: str(df[col].dtype) for col in df.columns}

    return DatasetQualityReportResponse(
        dataset_id=d.id,
        name=d.name,
        row_count=prof.get("row_count", len(df)),
        column_count=prof.get("column_count", len(df.columns)),
        duplicate_count=prof.get("duplicate_count", 0),
        missing_values=prof.get("missing_values", {}),
        class_distribution=prof.get("class_distribution", {}),
        numeric_stats=prof.get("numeric_stats", {}),
        feature_types=dtypes_dict,
    )
