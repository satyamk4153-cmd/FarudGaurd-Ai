from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator
from backend.app.models.prediction import RiskLevel
from backend.app.models.investigation import CaseStatus
from backend.app.schemas.transactions import TransactionResponse

class InvestigationNoteCreate(BaseModel):
    note: Optional[str] = None
    content: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def check_note_or_content(cls, data: Any):
        if isinstance(data, dict):
            note = data.get("note") or data.get("content")
            if not note or len(str(note).strip()) < 3:
                raise ValueError("Note content must be at least 3 characters long.")
            data["note"] = str(note).strip()
        return data

class InvestigationNoteResponse(BaseModel):
    id: int
    case_id: int
    user_id: Optional[int] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = "Analyst"
    note: str
    is_automated: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InvestigationCaseCreate(BaseModel):
    transaction_id: Optional[int] = None
    transaction_ids: Optional[List[Union[int, str]]] = None
    priority: Optional[RiskLevel] = RiskLevel.MEDIUM
    summary: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_case_fields(cls, data: Any):
        if isinstance(data, dict):
            # Resolve summary
            summary = data.get("summary") or data.get("title") or (data.get("description") and str(data.get("description"))[:50])
            if not summary or len(str(summary).strip()) < 3:
                summary = "Suspicious Transaction Investigation"
            data["summary"] = str(summary).strip()

            # Resolve transaction_id
            if data.get("transaction_id") is None:
                txns = data.get("transaction_ids")
                if txns and len(txns) > 0:
                    first = txns[0]
                    if isinstance(first, int):
                        data["transaction_id"] = first
                    elif isinstance(first, str) and first.isdigit():
                        data["transaction_id"] = int(first)
        return data

class InvestigationCaseUpdate(BaseModel):
    status: Optional[CaseStatus] = None
    priority: Optional[RiskLevel] = None
    assigned_to: Optional[int] = None
    resolution_summary: Optional[str] = None

class InvestigationCaseResponse(BaseModel):
    id: int
    case_number: str
    transaction_id: int
    assigned_to: Optional[int] = None
    assigned_to_id: Optional[int] = None
    assignee_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: RiskLevel
    status: CaseStatus
    summary: str
    title: Optional[str] = None
    description: Optional[str] = None
    resolution_summary: Optional[str] = None
    opened_at: datetime
    created_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    updated_at: datetime
    creator_id: Optional[int] = 1
    creator_name: Optional[str] = "Security Team"
    transaction_count: int = 1
    total_amount_at_risk: float = 0.0
    transaction_ids: List[str] = []
    transaction: Optional[TransactionResponse] = None
    notes: Optional[List[InvestigationNoteResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class InvestigationCaseListResponse(BaseModel):
    items: List[InvestigationCaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
