from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.api.dependencies.auth import require_analyst
from backend.app.models.user import User
from backend.app.schemas.investigations import (
    InvestigationCaseCreate,
    InvestigationCaseUpdate,
    InvestigationCaseResponse,
    InvestigationCaseListResponse,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
)
from backend.app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/investigations", tags=["Investigation Cases"])

@router.get("", response_model=InvestigationCaseListResponse)
@router.get("/cases", response_model=InvestigationCaseListResponse, include_in_schema=False)
def get_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """List investigation cases."""
    return InvestigationService.list_cases(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
    )

@router.get("/{case_id}", response_model=InvestigationCaseResponse)
@router.get("/cases/{case_id}", response_model=InvestigationCaseResponse, include_in_schema=False)
def get_case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Retrieve full investigation case dossier and notes."""
    case_res = InvestigationService.get_case_detail(db, case_id)
    if not case_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation case with ID {case_id} not found.",
        )
    return case_res

@router.post("", response_model=InvestigationCaseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/cases", response_model=InvestigationCaseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_case(
    req: InvestigationCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Create a new fraud investigation case."""
    try:
        case_obj = InvestigationService.create_case(
            db=db,
            req=req,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return InvestigationService.get_case_detail(db, case_obj.id)

@router.patch("/{case_id}", response_model=InvestigationCaseResponse)
@router.patch("/cases/{case_id}", response_model=InvestigationCaseResponse, include_in_schema=False)
def update_case(
    case_id: int,
    req: InvestigationCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Update case status, priority, or resolution."""
    updated = InvestigationService.update_case(
        db=db,
        case_id=case_id,
        req=req,
        user_id=current_user.id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation case with ID {case_id} not found.",
        )
    return InvestigationService.get_case_detail(db, case_id)

@router.post("/{case_id}/notes", response_model=InvestigationNoteResponse, status_code=status.HTTP_201_CREATED)
@router.post("/cases/{case_id}/notes", response_model=InvestigationNoteResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def add_case_note(
    case_id: int,
    req: InvestigationNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Append an analyst note to the case history."""
    note = InvestigationService.add_note(
        db=db,
        case_id=case_id,
        note_text=req.note,
        user_id=current_user.id,
    )
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation case with ID {case_id} not found.",
        )
    return InvestigationNoteResponse(
        id=note.id,
        case_id=note.case_id,
        user_id=note.user_id,
        author_name=current_user.name,
        note=note.note,
        created_at=note.created_at,
    )
