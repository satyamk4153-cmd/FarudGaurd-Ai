from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CopilotMessage(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Message text")

class CopilotEvidence(BaseModel):
    transaction_id: Optional[str] = None
    model: Optional[str] = None
    fraud_probability: Optional[float] = None
    risk_score: Optional[float] = None
    sources: List[str] = Field(default_factory=list)

class CopilotQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    context_type: Optional[str] = "GENERAL"  # GENERAL, TRANSACTION, INVESTIGATION, MODEL
    context_id: Optional[str] = None
    history: Optional[List[CopilotMessage]] = Field(default_factory=list, description="Prior conversation turns")

class CopilotQueryResponse(BaseModel):
    answer: str
    grounded_data: Optional[Dict[str, Any]] = None
    evidence: Optional[CopilotEvidence] = None
    sources: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    suggested_actions: Optional[List[Dict[str, str]]] = None
    tool_calls: List[str] = Field(default_factory=list)
    provider: str = Field(default="grounded-fallback", description="Provider identifier: 'gemini' | 'grounded-fallback'")
    mode: str = Field(default="fallback", description="Provider operational mode: 'live' | 'fallback'")
    data_source: str = "FraudGuard Authoritative Store"
    disclaimer: str = "Responses are generated from FraudGuard data and may require analyst verification."

class CopilotStatusResponse(BaseModel):
    provider: str
    mode: str
    status: str
    model: str
    available_tools_count: int
