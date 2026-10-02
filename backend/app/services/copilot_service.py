import logging
from sqlalchemy.orm import Session
from backend.app.schemas.copilot import CopilotQueryRequest, CopilotQueryResponse
from backend.app.services.gemini_client import get_gemini_client, get_gemini_status

logger = logging.getLogger("fraudguard.copilot")

class CopilotService:
    @staticmethod
    def answer_query(db: Session, req: CopilotQueryRequest) -> CopilotQueryResponse:
        """
        Grounded AI Copilot for Fraud Analysts.
        Dispatches query through GeminiClient (Real Gemini with tool calling, or grounded Mock fallback).
        Strictly retrieves real database records and SHAP attributions without fabrication.
        """
        client = get_gemini_client()
        result = client.ask(
            db=db,
            query=req.query,
            context_type=req.context_type,
            context_id=req.context_id,
            history=req.history,
        )
        answer, grounded_data, evidence, sources, followups, tool_calls = result[0:6]
        provider = getattr(result, "provider", getattr(client, "provider", "grounded-fallback"))
        mode = getattr(result, "mode", getattr(client, "mode", "fallback"))

        suggested_actions = [
            {"label": "View Live Transactions", "action": "/transactions"},
            {"label": "View Alert Center", "action": "/alerts"},
        ]
        if evidence and evidence.transaction_id:
            suggested_actions = [
                {"label": f"Inspect {evidence.transaction_id}", "action": f"/transactions/{evidence.transaction_id}"},
                {"label": "Escalate to Case", "action": f"/investigations?create_for={evidence.transaction_id}"},
            ]

        return CopilotQueryResponse(
            answer=answer,
            grounded_data=grounded_data,
            evidence=evidence,
            sources=sources,
            suggested_followups=followups,
            suggested_actions=suggested_actions,
            tool_calls=tool_calls,
            provider=provider,
            mode=mode,
            data_source="FraudGuard Authoritative Store",
            disclaimer="Responses are generated from FraudGuard data and may require analyst verification.",
        )
