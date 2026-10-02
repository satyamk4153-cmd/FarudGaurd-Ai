import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_and_readiness():
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "HEALTHY"

    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"
    assert res_ready.json()["database"] == "CONNECTED"
    assert res_ready.json()["model_engine"] == "LOADED"

def test_public_registration_role_escalation_prevented():
    # Attempt to supply role='ADMIN' in payload
    payload = {
        "name": "Hacker Attempt",
        "email": "hacker@fraudguard.ai",
        "password": "Password@123",
        "role": "ADMIN",  # Should be ignored/rejected by schema
    }
    res = client.post("/api/auth/register", json=payload)
    if res.status_code == 409:
        # Already registered, log in to check role
        login_res = client.post("/api/auth/login", json={"email": "hacker@fraudguard.ai", "password": "Password@123"})
        user_data = login_res.json()["user"]
        assert user_data["role"] == "USER"
    else:
        assert res.status_code == 201
        data = res.json()
        assert data["role"] == "USER"  # Strictly USER!

def test_login_and_authenticated_routes():
    res_login = client.post("/api/auth/login", json={"email": "admin@fraudguard.ai", "password": "Admin@123456"})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Dashboard
    res_dash = client.get("/api/dashboard/summary", headers=headers)
    assert res_dash.status_code == 200
    assert res_dash.json()["total_transactions"] >= 3000

    # Transactions
    res_txns = client.get("/api/transactions?page=1&page_size=5", headers=headers)
    assert res_txns.status_code == 200
    assert len(res_txns.json()["items"]) == 5

    # Alerts
    res_alerts = client.get("/api/alerts?page=1&page_size=5", headers=headers)
    assert res_alerts.status_code == 200
    assert "items" in res_alerts.json()

    # Investigations
    res_cases = client.get("/api/investigations?page=1&page_size=5", headers=headers)
    assert res_cases.status_code == 200
    assert "items" in res_cases.json()

def test_single_predict_endpoint():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    txn_payload = {
        "amount": 185000.0,
        "transaction_type": "TRANSFER",
        "merchant_category": "LUXURY",
        "location": "London",
        "channel": "ONLINE",
        "account_age_days": 20,
        "transaction_frequency": 12,
        "previous_transaction_amount": 1500.0,
        "balance_before": 190000.0,
        "balance_after": 5000.0,
        "distance_from_previous_transaction": 6500.0,
        "ip_risk": 0.92,
        "device_risk": 0.90,
    }
    res = client.post("/api/predict", json=txn_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["prediction"] in ["Potential Fraud", "Legitimate"]
    assert "risk_score" in data
    assert "fraud_probability" in data
    assert "anomaly_score" in data
    assert data["explanation"] is not None
    assert len(data["explanation"]["top_factors"]) > 0

def test_copilot_grounded_query():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/copilot/query", json={"query": "Show highest risk transactions"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["answer"]) > 20
    assert "top_transactions" in data["grounded_data"]

def test_transaction_export_csv():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    headers = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    res = client.get("/api/transactions/export/csv", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "transaction_id,timestamp,user_id,amount" in res.text

def test_transaction_lookup_by_external_and_int_id():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    headers = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    txns = client.get("/api/transactions?page=1&page_size=1", headers=headers).json()["items"]
    assert len(txns) > 0
    t1 = txns[0]

    # Query by integer ID
    res_int = client.get(f"/api/transactions/{t1['id']}", headers=headers)
    assert res_int.status_code == 200
    assert res_int.json()["id"] == t1["id"]

    # Query by external string ID
    res_ext = client.get(f"/api/transactions/{t1['external_transaction_id']}", headers=headers)
    assert res_ext.status_code == 200
    assert res_ext.json()["id"] == t1["id"]

def test_alert_detail_and_search():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    headers = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    alerts = client.get("/api/alerts?page=1&page_size=5", headers=headers).json()["items"]
    if len(alerts) > 0:
        a1 = alerts[0]
        res_detail = client.get(f"/api/alerts/{a1['id']}", headers=headers)
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == a1["id"]
        assert "rule_triggered" in res_detail.json()

        # Search filter
        res_search = client.get(f"/api/alerts?search={a1['rule_triggered'][:4]}", headers=headers)
        assert res_search.status_code == 200

def test_investigation_creation_and_interop():
    res_login = client.post("/api/auth/login", json={"email": "analyst@fraudguard.ai", "password": "Analyst@123456"})
    headers = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    txns = client.get("/api/transactions?page=1&page_size=1", headers=headers).json()["items"]
    assert len(txns) > 0
    txn_id = txns[0]["id"]

    payload = {
        "title": "Automated Test Forensic Investigation Case",
        "description": "Suspected anomalous transfer pattern detected in stress test suite",
        "priority": "HIGH",
        "transaction_ids": [str(txn_id)],
    }
    res_case = client.post("/api/investigations/cases", json=payload, headers=headers)
    assert res_case.status_code == 201
    case_data = res_case.json()
    assert "case_number" in case_data
    assert case_data["transaction_id"] == txn_id

    res_note = client.post(
        f"/api/investigations/{case_data['id']}/notes",
        json={"note": "Initial forensic trace verified with low false positive probability."},
        headers=headers,
    )
    assert res_note.status_code == 201
    assert "note" in res_note.json()
