from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from backend.app.models.job import JobStatus, JobType

class JobCreate(BaseModel):
    job_type: str
    parameters: Optional[Dict[str, Any]] = None

class JobResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: int
    user_id: Optional[int] = None
    error_message: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class JobListResponse(BaseModel):
    total: int
    items: List[JobResponse]
