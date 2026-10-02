# FraudGuard AI — Architectural Specification

## 1. System Overview
**FraudGuard AI** is a production-grade, explainable AI-powered financial fraud detection, risk analytics, anomaly detection, and investigation platform. The system is designed to provide high-throughput, low-latency transaction scoring while delivering local, feature-level regulatory explainability (SHAP attributions) to meet modern compliance standards (such as the Equal Credit Opportunity Act and adverse action reporting).

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts            |
|  - Real-time Dashboard           - Single Transaction Analyzer (SHAP Waterfall)  |
|  - Live WebSocket Stream Monitor - Batch CSV Upload Workbench                    |
|  - Forensic Case Investigation   - Model Governance & Drift Observability        |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS
                                           v
+-----------------------------------------------------------------------------------+
|                             API GATEWAY & FASTAPI CORE                            |
|  FastAPI (Python 3.12) - REST + WebSocket Endpoints                               |
|  - CORS & Security Middleware     - Timing & Request Correlation Logging          |
|  - JWT Bearer Authentication      - Role-Based Access Control (ADMIN, ANALYST,    |
|  - Pydantic v2 Input Validation     USER)                                         |
+---------------------+--------------------+--------------------+-------------------+
                      |                    |                    |
                      v                    v                    v
+-----------------------------+ +------------------------+ +------------------------+
|      SERVICES LAYER         | |   REAL-TIME ML ENGINE  | |  INVESTIGATION & TRIAGE|
| - Dashboard Analytics Svc   | | - Singleton In-Memory  | | - Alert Triage Queue   |
| - Transaction Query Svc     | |   Inference Cache      | | - Casefile Management  |
| - Model Promotion Svc       | | - XGBoost Champion v1  | | - Case Notes & Logs    |
| - Data Catalog & Profiling  | | - Isolation Forest     | | - Grounded Copilot     |
| - PSI Drift Telemetry Svc   | | - SHAP TreeExplainer   | |   (DB Grounded Q&A)    |
| - Security & Audit Svc      | | - Multi-Signal Blend   | |                        |
+-----------------------------+ +------------------------+ +------------------------+
                      |                    |                    |
                      +--------------------+--------------------+
                                           | SQLAlchemy 2.0 ORM
                                           v
+-----------------------------------------------------------------------------------+
|                              PERSISTENCE & DATA LAYER                             |
|  SQLite 3 (WAL Mode) / PostgreSQL Compatible                                      |
|  14 Structured Relational Tables:                                                 |
|  Users, Transactions, Predictions, FraudAlerts, InvestigationCases, Notes,        |
|  ModelVersions, ModelEvaluations, Datasets, FeatureMetadata, DriftReports, Logs   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Component Subsystems

### 3.1 Inference Engine & Multi-Signal Risk Scoring
The scoring pipeline rejects simplistic single-score classifications in favor of an authenticated multi-signal weighted heuristic:
- **Supervised Machine Learning Signal (Weight: 55%):** Output probability from the active production champion model (XGBoost Classifier v1).
- **Unsupervised Anomaly Detection Signal (Weight: 25%):** Outlier scoring produced by an Isolation Forest model trained on legitimate transaction distributions.
- **Behavioral Velocity & Heuristic Signal (Weight: 20%):** Deterministic risk indicators factoring in 1-hour transaction frequency, 24-hour transaction frequency, amount-to-historical-average ratio, and distance from home.

$$\text{Final Risk Score} = (0.55 \cdot P_{\text{supervised}} + 0.25 \cdot S_{\text{anomaly}} + 0.20 \cdot S_{\text{behavioral}}) \times 100$$

### 3.2 Decisioning Matrix
1. **APPROVE (Risk Score: 0 – 30):** Frictionless authorization.
2. **REVIEW (Risk Score: 31 – 74):** Soft flag dispatched to the Alert Triage Queue; step-up verification (2FA) recommended.
3. **BLOCK (Risk Score: 75 – 100):** Automated payment authorization refusal with hard decline code.

### 3.3 Explainable AI (XAI) Architecture
Every transaction evaluated by the machine learning pipeline is mapped to a calibrated SHAP (SHapley Additive exPlanations) TreeExplainer. The engine extracts exact marginal feature attributions, quantifying how each observed value (e.g. device risk, velocity, amount) altered the base logarithmic odds of fraud.

### 3.4 Real-Time WebSocket Streaming Pipeline
A persistent WebSocket pipeline (`/ws/live-transactions`) broadcasts simulated real-time authorizations. The streaming engine models Poisson arrival processes with randomized anomalous velocity bursts to test operational alerting under live conditions.

---

## 4. Security & Access Control
- **Cryptographic Hashing:** Passwords hashed with Bcrypt (salt work factor: 12).
- **Stateless Tokens:** PyJWT tokens signed with HMAC-SHA256, carrying user role and expiration claims.
- **Role-Based Access Control (RBAC):**
  - `USER`: Standard viewer access.
  - `ANALYST`: Transaction forensics, alert triage, case management, and note generation.
  - `ADMIN`: Model promotion, user role elevation, and security audit log inspection.
- **Audit Logging:** Every sensitive write action (alert update, case creation, model promotion, user modification) is immutably logged with actor email, IP address, and timestamp.
