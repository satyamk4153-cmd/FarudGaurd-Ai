import os
import io
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.core.celery_app import celery_app
from backend.app.db.session import SessionLocal
from backend.app.models.job import JobStatus, JobType
from backend.app.services.job_service import JobService
from backend.app.models.audit import AuditLog
from backend.app.core.config import settings
from ml.inference.engine import InferenceEngine
from ml.preprocessing.validator import DatasetValidator

logger = logging.getLogger(__name__)

def execute_batch_csv_job(job_id: str, input_csv_path: str, user_id: int):
    """Core logic to process batch CSV and update job progress/status."""
    db: Session = SessionLocal()
    try:
        JobService.update_job_status(db, job_id, JobStatus.RUNNING, progress=10)

        # 1. Load CSV
        csv_file = Path(input_csv_path)
        if not csv_file.exists():
            raise FileNotFoundError(f"Input batch file not found at {input_csv_path}")

        df = pd.read_csv(csv_file)
        JobService.update_job_status(db, job_id, JobStatus.RUNNING, progress=30)

        # 2. Validate
        val_res = DatasetValidator.validate_dataset(df, require_target=False)
        if not val_res["is_valid"]:
            raise ValueError(f"Schema validation failed: {'; '.join(val_res['errors'])}")

        # 3. Vectorized Prediction with Measured Latency
        engine = InferenceEngine.get_instance()
        if not engine.is_loaded:
            raise RuntimeError("Inference engine artifacts are not loaded.")

        JobService.update_job_status(db, job_id, JobStatus.RUNNING, progress=50)
        import time
        t_batch_start = time.perf_counter()
        enriched_df = engine.predict_batch(df)
        batch_duration_ms = round((time.perf_counter() - t_batch_start) * 1000.0, 2)
        avg_latency_ms = round(batch_duration_ms / max(1, len(enriched_df)), 2)
        JobService.update_job_status(db, job_id, JobStatus.RUNNING, progress=80)

        # 4. Save Enriched Output
        uploads_dir = Path(settings.UPLOAD_DIRECTORY)
        uploads_dir.mkdir(exist_ok=True)
        out_filename = f"enriched_batch_{job_id}.csv"
        out_path = uploads_dir / out_filename

        # Formula injection mitigation
        for col in enriched_df.select_dtypes(include="object").columns:
            enriched_df[col] = enriched_df[col].astype(str).apply(
                lambda x: f"'{x}" if x.startswith(("=", "+", "-", "@")) else x
            )

        enriched_df.to_csv(out_path, index=False)

        fraud_mask = (enriched_df["prediction"] == "Potential Fraud") | (enriched_df["risk_level"].isin(["HIGH", "CRITICAL"]))
        fraud_count = int(fraud_mask.sum())
        high_count = int((enriched_df["risk_level"] == "HIGH").sum())
        crit_count = int((enriched_df["risk_level"] == "CRITICAL").sum())
        avg_risk = float(enriched_df["risk_score"].mean())

        total_amount_at_risk = 0.0
        if "amount" in enriched_df.columns:
            try:
                total_amount_at_risk = round(float(pd.to_numeric(enriched_df.loc[fraud_mask, "amount"], errors="coerce").fillna(0.0).sum()), 2)
            except Exception:
                total_amount_at_risk = 0.0

        result = {
            "total_records": len(df),
            "processed_records": len(enriched_df),
            "potential_fraud_count": fraud_count,
            "high_risk_count": high_count,
            "critical_risk_count": crit_count,
            "average_risk_score": round(avg_risk, 1),
            "total_amount_at_risk": total_amount_at_risk,
            "avg_latency_ms": avg_latency_ms,
            "download_url": f"/api/predict/batch/{job_id}/download",
            "file_name": out_filename,
        }

        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="BATCH_ANALYSIS",
            resource="BatchJob",
            resource_id=job_id,
            details_json=json.dumps(result),
        )
        db.add(audit)
        db.commit()

        JobService.update_job_status(db, job_id, JobStatus.COMPLETED, progress=100, result=result)
        logger.info(f"Batch prediction job {job_id} completed successfully.")
        return result

    except Exception as e:
        logger.error(f"Error processing batch prediction job {job_id}: {e}", exc_info=True)
        JobService.update_job_status(db, job_id, JobStatus.FAILED, error_message=str(e))
        raise
    finally:
        db.close()

@celery_app.task(name="tasks.process_batch_csv")
def process_batch_csv_task(job_id: str, input_csv_path: str, user_id: int):
    return execute_batch_csv_job(job_id, input_csv_path, user_id)
