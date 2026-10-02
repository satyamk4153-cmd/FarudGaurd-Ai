from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import get_current_user
from backend.app.models.user import User
from backend.app.schemas.copilot import CopilotQueryRequest, CopilotQueryResponse, CopilotStatusResponse
from backend.app.services.copilot_service import CopilotService
from backend.app.services.gemini_client import get_gemini_client, get_gemini_status
from backend.app.core.config import settings

router = APIRouter(prefix="/copilot", tags=["FraudGuard Analyst Copilot"])

@router.get("/status", response_model=CopilotStatusResponse)
def get_copilot_status(current_user: User = Depends(get_current_user)):
    """Retrieve operational status of the Copilot assistant (live Gemini or local fallback)."""
    client = get_gemini_client()
    return CopilotStatusResponse(
        provider=getattr(client, "provider", "grounded-fallback"),
        mode=getattr(client, "mode", "fallback"),
        status=get_gemini_status(),
        model=settings.GEMINI_MODEL,
        available_tools_count=16,
    )

@router.post("/query", response_model=CopilotQueryResponse)
def query_copilot(
    req: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Query the grounded FraudGuard Analyst Copilot.
    Synthesizes real transactional data, SHAP attributions, and alert metrics without fabrication.
    """
    return CopilotService.answer_query(db=db, req=req)
