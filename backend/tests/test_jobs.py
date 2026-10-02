import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.job import BackgroundJob, JobStatus, JobType
from backend.app.services.job_service import JobService

client = TestClient(app)

def test_job_service_lifecycle():
    db = SessionLocal()
    try:
        # 1. Create Job
        job = JobService.create_job(
            db,
            job_type=JobType.BATCH_PREDICTION,
            user_id=1,
            parameters={"batch_name": "test_batch.csv"},
        )
        assert job.job_id.startswith("JOB-")
        assert job.status == JobStatus.QUEUED
        assert job.progress == 0

        # 2. Update to RUNNING
        JobService.update_job_status(db, job.job_id, JobStatus.RUNNING, progress=45)
        job_updated = JobService.get_job(db, job.job_id)
        assert job_updated.status == JobStatus.RUNNING
        assert job_updated.progress == 45
        assert job_updated.started_at is not None

        # 3. Complete Job
        JobService.update_job_status(
            db,
            job.job_id,
            JobStatus.COMPLETED,
            progress=100,
            result={"processed_count": 150, "fraud_detected": 4},
        )
        job_completed = JobService.get_job(db, job.job_id)
        assert job_completed.status == JobStatus.COMPLETED
        assert job_completed.progress == 100
        assert job_completed.completed_at is not None
    finally:
        db.close()

def test_job_api_endpoints():
    res_login = client.post("/api/auth/login", json={"email": "admin@fraudguard.ai", "password": "Admin@123456"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List jobs
    res_list = client.get("/api/jobs?limit=5", headers=headers)
    assert res_list.status_code == 200
    data = res_list.json()
    assert "total" in data
    assert "items" in data

    # Create a job directly in db and fetch via API
    db = SessionLocal()
    try:
        j = JobService.create_job(db, JobType.MODEL_TRAINING, user_id=1, parameters={"epochs": 10})
        job_id = j.job_id
    finally:
        db.close()

    res_single = client.get(f"/api/jobs/{job_id}", headers=headers)
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["job_id"] == job_id
    assert single_data["job_type"] == "MODEL_TRAINING"
    assert single_data["status"] == "QUEUED"
