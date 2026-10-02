import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models.job import BackgroundJob, JobStatus, JobType
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class JobService:
    @staticmethod
    def create_job(
        db: Session,
        job_type: JobType,
        user_id: Optional[int] = None,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> BackgroundJob:
        job_id = f"JOB-{uuid.uuid4().hex[:10].upper()}"
        job = BackgroundJob(
            job_id=job_id,
            job_type=job_type,
            status=JobStatus.QUEUED,
            progress=0,
            user_id=user_id,
            parameters_json=json.dumps(parameters or {}),
            created_at=datetime.now(timezone.utc),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_job(db: Session, job_id: str) -> Optional[BackgroundJob]:
        return db.query(BackgroundJob).filter(BackgroundJob.job_id == job_id).first()

    @staticmethod
    def list_jobs(
        db: Session,
        user_id: Optional[int] = None,
        job_type: Optional[JobType] = None,
        status: Optional[JobStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[int, List[BackgroundJob]]:
        q = db.query(BackgroundJob)
        if user_id is not None:
            q = q.filter(BackgroundJob.user_id == user_id)
        if job_type is not None:
            q = q.filter(BackgroundJob.job_type == job_type)
        if status is not None:
            q = q.filter(BackgroundJob.status == status)

        total = q.count()
        jobs = q.order_by(BackgroundJob.created_at.desc()).offset(offset).limit(limit).all()
        return total, jobs

    @staticmethod
    def update_job_status(
        db: Session,
        job_id: str,
        status: JobStatus,
        progress: Optional[int] = None,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[BackgroundJob]:
        job = db.query(BackgroundJob).filter(BackgroundJob.job_id == job_id).first()
        if not job:
            return None

        job.status = status
        if progress is not None:
            job.progress = max(0, min(100, progress))

        if status == JobStatus.RUNNING and not job.started_at:
            job.started_at = datetime.now(timezone.utc)

        if status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            job.completed_at = datetime.now(timezone.utc)
            if status == JobStatus.COMPLETED:
                job.progress = 100

        if result is not None:
            job.result_json = json.dumps(result)

        if error_message:
            job.error_message = error_message

        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def format_job_response(job: BackgroundJob) -> Dict[str, Any]:
        params = {}
        if job.parameters_json:
            try:
                params = json.loads(job.parameters_json)
            except Exception:
                pass

        res = {}
        if job.result_json:
            try:
                res = json.loads(job.result_json)
            except Exception:
                pass

        return {
            "job_id": job.job_id,
            "job_type": job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type),
            "status": job.status.value if hasattr(job.status, "value") else str(job.status),
            "progress": job.progress,
            "user_id": job.user_id,
            "error_message": job.error_message,
            "parameters": params,
            "result": res,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
