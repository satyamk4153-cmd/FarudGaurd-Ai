import asyncio
import json
import random
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.status import WS_1008_POLICY_VIOLATION
from backend.app.security.jwt import decode_access_token
from ml.preprocessing.generator import FinancialDataGenerator
from ml.inference.engine import InferenceEngine

router = APIRouter(tags=["Live WebSocket Stream"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Generator for live stream
generator = FinancialDataGenerator(num_customers=500, num_merchants=80, num_devices=800, seed=12345)


@router.websocket("/ws/live-transactions")
async def websocket_live_transactions(websocket: WebSocket):
    """
    WebSocket endpoint streaming live synthetic transactions evaluated through the real ML inference engine.
    """
    token = websocket.query_params.get("token")
    if token:
        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

    await manager.connect(websocket)
    engine = InferenceEngine.get_instance()
    
    try:
        # Loop generating and scoring live transactions every 1.5 to 2.5 seconds
        while True:
            # 5% chance of generating a fraud transaction pattern in live stream
            is_fraud_event = random.random() < 0.08
            fraud_rate = 1.0 if is_fraud_event else 0.0
            
            # Generate 1 transaction row
            df_single = generator.generate_transactions(
                num_rows=1,
                fraud_rate=fraud_rate,
                start_date=datetime.now(timezone.utc),
                days_span=1,
            )
            raw_row = df_single.iloc[0].to_dict()
            
            # Real Inference Pipeline Evaluation
            scored = engine.predict_single(raw_row, compute_shap=False)

            now = datetime.now(timezone.utc)
            risk_score = float(scored.get("risk_score", 0))
            if risk_score >= 75:
                decision = "BLOCK"
            elif risk_score > 30:
                decision = "REVIEW"
            else:
                decision = "APPROVE"

            location_str = str(raw_row.get("location", "New York, USA"))
            loc_parts = [p.strip() for p in location_str.split(",")]
            city = loc_parts[0] if len(loc_parts) > 0 else "New York"
            country = loc_parts[1] if len(loc_parts) > 1 else raw_row.get("country", "USA")

            packet = {
                "type": "TRANSACTION_EVENT",
                "timestamp": now.isoformat(),
                "timestamp_iso": now.isoformat(),
                "time_display": now.strftime("%H:%M:%S"),
                "transaction_id": raw_row.get("external_transaction_id", f"TXN-{random.randint(100000, 999999)}"),
                "external_transaction_id": raw_row.get("external_transaction_id"),
                "user_id": raw_row.get("customer_id", "CUST-001"),
                "customer_id": raw_row.get("customer_id", "CUST-001"),
                "merchant_id": raw_row.get("merchant_id", "MERCH-001"),
                "merchant_category": raw_row.get("merchant_category", "RETAIL"),
                "city": city,
                "country": country,
                "location": location_str,
                "amount": float(raw_row.get("amount", 0.0)),
                "currency": raw_row.get("currency", "USD"),
                "transaction_type": raw_row.get("transaction_type", "PURCHASE"),
                "decision": decision,
                "fraud_probability": scored.get("fraud_probability", 0.0),
                "risk_score": risk_score,
                "risk_level": scored.get("risk_level", "LOW"),
                "anomaly_score": scored.get("anomaly_score", 0.0),
                "is_anomaly": scored.get("is_anomaly", False),
                "prediction": scored.get("prediction", "Legitimate"),
                "triggered_rules": scored.get("triggered_rules", []),
            }

            await websocket.send_json(packet)
            # Sleep 1.5 seconds between events
            await asyncio.sleep(1.8)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
