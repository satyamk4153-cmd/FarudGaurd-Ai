import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum
from backend.app.db.session import Base

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class JobType(str, enum.Enum):
    BATCH_PREDICTION = "BATCH_PREDICTION"
    MODEL_TRAINING = "MODEL_TRAINING"
    DATASET_GENERATION = "DATASET_GENERATION"
    DRIFT_CALCULATION = "DRIFT_CALCULATION"
    EXPORT_REPORT = "EXPORT_REPORT"

class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    job_type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    progress = Column(Float, default=0.0)
    parameters_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
