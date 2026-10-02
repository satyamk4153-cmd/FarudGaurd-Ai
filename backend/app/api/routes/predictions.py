import os
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd

from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import Prediction, RiskLevel, PredictionLabel
from backend.app.models.alert import FraudAlert, AlertStatus
from backend.app.models.ml_models import ModelVersion
from backend.app.models.audit import AuditLog
from backend.app.schemas.predictions import (
    PredictRequest,
    PredictResponse,
    ExplanationResponse,
    ShapFactor,
    BatchPredictSummary,
)
from backend.app.core.config import settings
from ml.inference.engine import InferenceEngine
from ml.preprocessing.validator import DatasetValidator

router = APIRouter(prefix="/predict", tags=["Predictions & Inference"])

@router.post("", response_model=PredictResponse)
def predict_single_transaction(
    req: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Real-time inference on a single transaction.
    Runs active Champion Model, Isolation Forest, Multi-Signal Risk Engine, and SHAP TreeExplainer.
    Persists transaction, prediction, and automated alerts for elevated risks.
    """
    engine = InferenceEngine.get_instance()
    if not engine.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Machine Learning inference service is initializing or model artifacts are unavailable.",
        )

    txn_dict = req.model_dump()
    if not txn_dict.get("timestamp"):
        txn_dict["timestamp"] = datetime.now(timezone.utc)

    # 1. Execute Real Inference Pipeline
    res = engine.predict_single(txn_dict, compute_shap=True)

    # 2. Ingest Transaction
    ext_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    txn = Transaction(
        external_transaction_id=ext_id,
        customer_id=req.customer_id or f"CUST-{current_user.id:05d}",
        card_id=req.card_id or "CARD-DIRECT",
        amount=req.amount,
        currency=req.currency or "INR",
        transaction_type=req.transaction_type.upper(),
        merchant_id=req.merchant_id or "MERCH-ONLINE",
        merchant_category=req.merchant_category.upper(),
        location=req.location,
        country=req.country or "IN",
        device_id=req.device_id or "DEV-CLIENT",
        ip_address=req.ip_address or "127.0.0.1",
        channel=req.channel or "ONLINE",
        timestamp=txn_dict["timestamp"],
        account_age_days=req.account_age_days or 30,
        transaction_frequency=req.transaction_frequency or 1,
        previous_transaction_amount=req.previous_transaction_amount or 0.0,
        balance_before=req.balance_before or 0.0,
        balance_after=req.balance_after or 0.0,
        distance_from_previous_transaction=req.distance_from_previous_transaction or 0.0,
        ip_risk=req.ip_risk or 0.1,
        device_risk=req.device_risk or 0.1,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # 3. Find Active Model Version ID
    active_mv = db.query(ModelVersion).filter(ModelVersion.status == "ACTIVE").first()
    active_mv_id = active_mv.id if active_mv else None

    # 4. Save Prediction Record
    pred = Prediction(
        transaction_id=txn.id,
        model_version_id=active_mv_id,
        fraud_probability=res["fraud_probability"],
        risk_score=res["risk_score"],
        risk_level=RiskLevel(res["risk_level"]),
        prediction=PredictionLabel(res["prediction"]),
        anomaly_score=res["anomaly_score"],
        explanation_json=json.dumps(res.get("explanation", {})),
        rule_flags_json=json.dumps(res.get("triggered_rules", [])),
        created_at=datetime.now(timezone.utc),
    )
    db.add(pred)
    db.commit()

    # 5. Automated Alert Generation if High or Critical Risk
    if res["risk_level"] in [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]:
        alert_reason = "; ".join(res.get("triggered_rules", []))
        if not alert_reason:
            alert_reason = f"Automated risk trigger: {res['risk_level']} risk score ({res['risk_score']:.1f})"

        alert = FraudAlert(
            transaction_id=txn.id,
            severity=RiskLevel(res["risk_level"]),
            status=AlertStatus.NEW,
            alert_reason=alert_reason,
            created_at=datetime.now(timezone.utc),
        )
        db.add(alert)
        db.commit()

    # Compute decision
    r_score = float(res.get("risk_score", 0))
    if r_score >= 75:
        decision = "BLOCK"
    elif r_score > 30:
        decision = "REVIEW"
    else:
        decision = "APPROVE"

    # Multi-signal breakdown
    supervised_comp = round(float(res.get("fraud_probability", 0.0)) * 55.0, 1)
    anomaly_comp = round(float(res.get("anomaly_score", 0.0)) * 25.0, 1)
    behavioral_comp = round(float(res.get("behavioral_score", 0.0)) * 20.0, 1)
    breakdown = {
        "supervised_component": supervised_comp,
        "anomaly_component": anomaly_comp,
        "behavioral_component": behavioral_comp,
    }

    # Format Explanation Response & top_risk_factors
    explanation_resp = None
    top_risk_factors = []
    raw_exp = res.get("explanation", {})
    if raw_exp:
        top_factors_list = [ShapFactor(**f) for f in raw_exp.get("top_factors", [])]
        pos_factors_list = [ShapFactor(**f) for f in raw_exp.get("positive_factors", [])]
        neg_factors_list = [ShapFactor(**f) for f in raw_exp.get("negative_factors", [])]
        explanation_resp = ExplanationResponse(
            base_value=raw_exp.get("base_value", 0.0),
            top_factors=top_factors_list,
            positive_factors=pos_factors_list,
            negative_factors=neg_factors_list,
        )

        for factor in raw_exp.get("top_factors", []):
            shap_val = float(factor.get("shap_value", 0.0))
            direction = "increases_risk" if shap_val > 0 else ("decreases_risk" if shap_val < 0 else "neutral")
            top_risk_factors.append({
                "feature": factor.get("feature", ""),
                "feature_label": factor.get("label", factor.get("feature", "")),
                "feature_value": factor.get("actual_value", ""),
                "shap_value": shap_val,
                "impact_direction": direction,
                "percentage_contribution": float(factor.get("percentage_contribution", 0.0)),
            })

    # Recommended actions based on decision
    if decision == "BLOCK":
        recommended_actions = [
            "Decline transaction authorization immediately",
            "Place temporary protective restriction on payment card",
            "Dispatch automated SMS / Push verification request to customer",
            "Auto-escalate event to Priority 1 Investigation Case",
        ]
    elif decision == "REVIEW":
        recommended_actions = [
            "Trigger step-up 3D-Secure / 2FA authentication challenge",
            "Hold funds pending secondary behavioral verification",
            "Queue transaction for manual fraud analyst review",
        ]
    else:
        recommended_actions = [
            "Approve transaction authorization with standard zero-friction processing",
            "Update customer behavioral baseline profile",
        ]

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="TRANSACTION_ANALYSIS",
        resource="Transaction",
        resource_id=str(txn.id),
        details_json=f'{{"risk_score": {res["risk_score"]}, "risk_level": "{res["risk_level"]}", "decision": "{decision}"}}',
    )
    db.add(audit)
    db.commit()

    return PredictResponse(
        transaction_id=txn.id,
        external_transaction_id=txn.external_transaction_id,
        prediction=res["prediction"],
        decision=decision,
        fraud_probability=res["fraud_probability"],
        risk_score=res["risk_score"],
        risk_level=res["risk_level"],
        anomaly_score=res["anomaly_score"],
        is_anomaly=res["is_anomaly"],
        threshold_used=res["threshold_used"],
        confidence_score=res["confidence_score"],
        model_name=res["model_name"],
        model_version=res["model_version"],
        algorithm=res["algorithm"],
        recommended_review_priority=res["recommended_review_priority"],
        prediction_time_ms=res["prediction_time_ms"],
        timing=res.get("timing"),
        breakdown=breakdown,
        triggered_rules=res["triggered_rules"],
        top_risk_factors=top_risk_factors,
        recommended_actions=recommended_actions,
        explanation=explanation_resp,
        created_at=pred.created_at,
    )

@router.post("/batch", response_model=BatchPredictSummary)
async def predict_batch_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process CSV batch upload.
    Validates CSV schema, runs vectorized batch inference, and produces an enriched downloadable dataset.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files (.csv) are accepted for batch processing.",
        )

    engine = InferenceEngine.get_instance()
    if not engine.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference engine is not loaded.",
        )

    try:
        content = await file.read()
        # Size limit check (50 MB)
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
            )

        import io
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded CSV: {str(e)}",
        )

    # Validate Schema
    val_res = DatasetValidator.validate_dataset(df, require_target=False)
    if not val_res["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV schema validation failed: {'; '.join(val_res['errors'])}",
        )

    # Execute Batch Prediction with Asynchronous Background Job Tracking
    from backend.app.models.job import JobType, JobStatus
    from backend.app.services.job_service import JobService
    from backend.app.workers.tasks import process_batch_csv_task, execute_batch_csv_job
    import logging
    import threading

    route_logger = logging.getLogger(__name__)

    safe_filename = Path(file.filename or "batch.csv").name
    job = JobService.create_job(
        db,
        job_type=JobType.BATCH_PREDICTION,
        user_id=current_user.id,
        parameters={"filename": safe_filename, "size_bytes": len(content)},
    )
    job_id = job.job_id

    # Save Raw Input CSV to uploads directory
    uploads_dir = Path(settings.UPLOAD_DIRECTORY)
    os.makedirs(uploads_dir, exist_ok=True)
    raw_in_path = uploads_dir / f"input_{job_id}.csv"
    with open(raw_in_path, "wb") as f_out:
        f_out.write(content)

    # Enqueue Celery task asynchronously. If Celery broker is offline, dispatch background daemon thread.
    task_enqueued = False
    try:
        process_batch_csv_task.delay(
            job_id=job_id,
            input_csv_path=str(raw_in_path),
            user_id=current_user.id,
        )
        task_enqueued = True
        route_logger.info(f"Enqueued batch CSV job {job_id} to Celery worker.")
    except Exception as exc:
        route_logger.warning(
            f"Celery broker unavailable ({exc}); dispatching background thread for job {job_id}."
        )
        bg_thread = threading.Thread(
            target=execute_batch_csv_job,
            kwargs={
                "job_id": job_id,
                "input_csv_path": str(raw_in_path),
                "user_id": current_user.id,
            },
            daemon=True,
        )
        bg_thread.start()

    return BatchPredictSummary(
        job_id=job_id,
        total_records=len(df),
        processed_records=0,
        potential_fraud_count=0,
        high_risk_count=0,
        critical_risk_count=0,
        average_risk_score=0.0,
        status="QUEUED" if task_enqueued else "RUNNING",
        progress=0,
        download_url=f"/api/predict/batch/{job_id}/download",
        message="Batch CSV processing task enqueued successfully.",
    )

@router.get("/batch/{job_id}/download")
def download_batch_results(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download enriched batch predictions CSV file."""
    import re
    if not re.match(r"^[a-zA-Z0-9_\-]+$", job_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job ID format.",
        )

    from backend.app.models.job import BackgroundJob
    job = db.query(BackgroundJob).filter(BackgroundJob.job_id == job_id).first()
    if job and current_user.role.value != "ADMIN" and job.user_id and job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to download this batch export.",
        )

    uploads_dir = Path(settings.UPLOAD_DIRECTORY).resolve()
    filename = f"enriched_batch_{job_id}.csv"
    filepath = (uploads_dir / filename).resolve()

    if not str(filepath).startswith(str(uploads_dir)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path.",
        )

    if not filepath.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch job results for ID '{job_id}' not found.",
        )

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="text/csv",
    )
