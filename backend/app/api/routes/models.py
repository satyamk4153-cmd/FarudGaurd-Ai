import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_admin, require_analyst
from backend.app.models.user import User
from backend.app.models.ml_models import ModelVersion, ModelEvaluation, ModelStatus
from backend.app.models.audit import AuditLog
from backend.app.schemas.models import (
    ModelVersionResponse,
    ModelEvaluationSummary,
    ModelTrainRequest,
    ChampionSummaryResponse,
)
from ml.training.trainer import ModelTrainingPipeline
from ml.inference.engine import InferenceEngine

router = APIRouter(prefix="/models", tags=["Model Center & Registry"])

@router.get("/champion-summary", response_model=ChampionSummaryResponse)
def get_champion_summary(db: Session = Depends(get_db)):
    """Public read-only summary of the current production champion model."""
    m = db.query(ModelVersion).filter(ModelVersion.status == ModelStatus.ACTIVE).first()
    if not m:
        m = db.query(ModelVersion).first()
    if not m or not m.evaluations:
        return ChampionSummaryResponse(available=False)
    e = m.evaluations[0]
    return ChampionSummaryResponse(
        available=True,
        name=m.name,
        algorithm=m.algorithm,
        version=m.version,
        f1=round(e.f1, 4),
        roc_auc=round(e.roc_auc, 4),
        pr_auc=round(e.pr_auc, 4),
    )

def run_training_background():
    """Background task for executing the ML training pipeline."""
    pipeline = ModelTrainingPipeline()
    pipeline.run(register_in_db=True)
    # Reload inference engine singleton with newly trained champion
    InferenceEngine.get_instance().load_artifacts()

@router.get("", response_model=List[ModelVersionResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """List all registered models and candidate versions."""
    models = db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()
    results = []
    for m in models:
        eval_summary = None
        if m.evaluations:
            e = m.evaluations[0]
            cm = json.loads(e.confusion_matrix_json) if e.confusion_matrix_json else [[0, 0], [0, 0]]
            roc = json.loads(e.roc_curve_json) if e.roc_curve_json else None
            pr = json.loads(e.pr_curve_json) if e.pr_curve_json else None
            eval_summary = ModelEvaluationSummary(
                id=e.id,
                accuracy=e.accuracy,
                precision=e.precision,
                recall=e.recall,
                f1=e.f1,
                roc_auc=e.roc_auc,
                pr_auc=e.pr_auc,
                precision_at_k=e.precision_at_k,
                recall_at_k=e.recall_at_k,
                threshold=e.threshold,
                confusion_matrix=cm,
                roc_curve=roc,
                pr_curve=pr,
            )

        results.append(
            ModelVersionResponse(
                id=m.id,
                name=m.name,
                algorithm=m.algorithm,
                version=m.version,
                status=m.status,
                threshold=m.threshold,
                artifact_path=m.artifact_path,
                created_at=m.created_at,
                updated_at=m.updated_at,
                latest_evaluation=eval_summary,
            )
        )
    return results

@router.get("/active", response_model=ModelVersionResponse)
def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve the currently deployed champion model in production."""
    m = db.query(ModelVersion).filter(ModelVersion.status == ModelStatus.ACTIVE).first()
    if not m:
        m = db.query(ModelVersion).first()
    if not m:
        raise HTTPException(status_code=404, detail="No active model found.")

    eval_summary = None
    if m.evaluations:
        e = m.evaluations[0]
        cm = json.loads(e.confusion_matrix_json) if e.confusion_matrix_json else [[0, 0], [0, 0]]
        roc = json.loads(e.roc_curve_json) if e.roc_curve_json else None
        pr = json.loads(e.pr_curve_json) if e.pr_curve_json else None
        eval_summary = ModelEvaluationSummary(
            id=e.id,
            accuracy=e.accuracy,
            precision=e.precision,
            recall=e.recall,
            f1=e.f1,
            roc_auc=e.roc_auc,
            pr_auc=e.pr_auc,
            precision_at_k=e.precision_at_k,
            recall_at_k=e.recall_at_k,
            threshold=e.threshold,
            confusion_matrix=cm,
            roc_curve=roc,
            pr_curve=pr,
        )

    return ModelVersionResponse(
        id=m.id,
        name=m.name,
        algorithm=m.algorithm,
        version=m.version,
        status=m.status,
        threshold=m.threshold,
        artifact_path=m.artifact_path,
        created_at=m.created_at,
        updated_at=m.updated_at,
        latest_evaluation=eval_summary,
    )

@router.get("/{model_id}", response_model=ModelVersionResponse)
def get_model_detail(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve full model version evaluation curves and confusion matrix."""
    m = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Model ID {model_id} not found.")

    eval_summary = None
    if m.evaluations:
        e = m.evaluations[0]
        cm = json.loads(e.confusion_matrix_json) if e.confusion_matrix_json else [[0, 0], [0, 0]]
        roc = json.loads(e.roc_curve_json) if e.roc_curve_json else None
        pr = json.loads(e.pr_curve_json) if e.pr_curve_json else None
        eval_summary = ModelEvaluationSummary(
            id=e.id,
            accuracy=e.accuracy,
            precision=e.precision,
            recall=e.recall,
            f1=e.f1,
            roc_auc=e.roc_auc,
            pr_auc=e.pr_auc,
            precision_at_k=e.precision_at_k,
            recall_at_k=e.recall_at_k,
            threshold=e.threshold,
            confusion_matrix=cm,
            roc_curve=roc,
            pr_curve=pr,
        )

    return ModelVersionResponse(
        id=m.id,
        name=m.name,
        algorithm=m.algorithm,
        version=m.version,
        status=m.status,
        threshold=m.threshold,
        artifact_path=m.artifact_path,
        created_at=m.created_at,
        updated_at=m.updated_at,
        latest_evaluation=eval_summary,
    )

@router.post("/train", status_code=status.HTTP_202_ACCEPTED)
def trigger_training(
    background_tasks: BackgroundTasks,
    req: ModelTrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Trigger an asynchronous model training pipeline run."""
    background_tasks.add_task(run_training_background)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="MODEL_TRAINING_TRIGGERED",
        resource="ModelVersion",
        details_json=json.dumps({"algorithms": req.algorithms}),
    )
    db.add(audit)
    db.commit()

    return {"message": "Model training pipeline successfully initiated in the background.", "status": "QUEUED"}

@router.post("/{model_id}/deploy", response_model=ModelVersionResponse)
def deploy_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Promote a candidate model version to ACTIVE champion for inference."""
    target_model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target_model:
        raise HTTPException(status_code=404, detail="Model not found.")

    # Archive previous active models
    db.query(ModelVersion).filter(ModelVersion.status == ModelStatus.ACTIVE).update({"status": ModelStatus.APPROVED})
    
    target_model.status = ModelStatus.ACTIVE
    target_model.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(target_model)

    # Reload inference engine
    InferenceEngine.get_instance().load_artifacts()

    audit = AuditLog(
        user_id=current_user.id,
        action="MODEL_DEPLOYED",
        resource="ModelVersion",
        resource_id=str(target_model.id),
        details_json=f'{{"algorithm": "{target_model.algorithm}", "version": "{target_model.version}"}}',
    )
    db.add(audit)
    db.commit()

    return get_model_detail(model_id, db, current_user)
