from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.job import JobStatus, JobType
from backend.app.services.job_service import JobService
from backend.app.schemas.jobs import JobResponse, JobListResponse

router = APIRouter(prefix="/jobs", tags=["Background Job Tracking"])

@router.get("", response_model=JobListResponse)
def list_jobs(
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by job status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List background jobs for current user or all jobs if admin."""
    user_id = None if current_user.role.value == "ADMIN" else current_user.id
    
    jt = None
    if job_type:
        try:
            jt = JobType(job_type)
        except ValueError:
            pass

    st = None
    if status_filter:
        try:
            st = JobStatus(status_filter)
        except ValueError:
            pass

    total, jobs = JobService.list_jobs(
        db,
        user_id=user_id,
        job_type=jt,
        status=st,
        limit=limit,
        offset=offset,
    )

    items = [JobResponse(**JobService.format_job_response(j)) for j in jobs]
    return JobListResponse(total=total, items=items)

@router.get("/{job_id}", response_model=JobResponse)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the real-time execution status and result of a background job."""
    job = JobService.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found.",
        )

    # Permission check: user can only see their own jobs unless admin
    if current_user.role.value != "ADMIN" and job.user_id and job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this job.",
        )

    return JobResponse(**JobService.format_job_response(job))
