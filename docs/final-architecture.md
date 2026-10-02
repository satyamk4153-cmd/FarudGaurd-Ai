# FraudGuard AI — Final Production Architecture

## 1. System Architecture Overview

```mermaid
graph TD
    Client[Web Browser / Analyst Workstation] -->|HTTPS / WSS| Nginx[Reverse Proxy / Nginx Web Server :80/:443]
    
    subgraph Frontend Tier
        Nginx -->|Static Assets / SPA Routing| ReactApp[React 18 + Vite + TanStack Query]
    end

    subgraph API & Gateway Tier
        Nginx -->|/api/* HTTP Requests| FastAPI[FastAPI Application Gateway :8000]
        Nginx -->|/ws/* WebSocket Stream| WSServer[Real-Time Live Monitor WebSocket]
    end

    subgraph Security & Access Control
        FastAPI --> AuthGuard[JWT Security & RBAC Middleware]
        AuthGuard --> AuditLog[Security Audit Logger]
    end

    subgraph Application Services Tier
        FastAPI --> TxnService[Transaction Ledger Service]
        FastAPI --> PredictService[Fraud Inference Engine]
        FastAPI --> AlertService[Alert Triage & Workflow]
        FastAPI --> InvestService[Case Investigation & Graph Analysis]
        FastAPI --> CopilotService[Gemini Analyst Copilot Service]
        FastAPI --> MLOpsService[Model Registry & Drift Monitor]
    end

    subgraph Storage & Infrastructure Tier
        TxnService --> Postgres[(PostgreSQL 16 Enterprise Database)]
        PredictService --> Postgres
        AlertService --> Postgres
        InvestService --> Postgres
        FastAPI --> Redis[(Redis 7 Cache & Task Broker :6379)]
        FastAPI --> CeleryWorker[Celery Background Workers]
        CeleryWorker --> Postgres
        CeleryWorker --> Redis
    end

    subgraph Layer 1: Machine Learning Engine
        PredictService --> FeatureEng[Feature Engineering Pipeline]
        FeatureEng --> XGBoost[XGBoost Champion Model]
        FeatureEng --> IsoForest[Isolation Forest Anomaly Detector]
        XGBoost & IsoForest --> RiskEngine[Multi-Signal Composite Risk Engine]
        RiskEngine --> TreeSHAP[TreeExplainer SHAP Local Attribution]
    end

    subgraph Layer 2: Generative AI Copilot
        CopilotService --> GoogleGenAI[Google Gemini 2.5 API]
        GoogleGenAI -->|Safe Tool Call| CopilotTools[16 Read-Only DB & ML Tools]
        CopilotTools --> Postgres
        CopilotTools --> PredictService
    end
```

---

## 2. Real-Time Transaction Inference Pipeline

Every transaction undergoes an authentic, synchronous machine learning pipeline without synthetic latency:

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Analyst / Payment Gateway
    participant API as FastAPI /api/predict
    participant FE as Feature Engineer (Scaler & Encoders)
    participant XGB as Active Champion Model (XGBoost)
    participant IF as Isolation Forest (Anomaly)
    participant RE as Composite Risk Engine
    participant SHAP as Tree SHAP Explainer
    participant DB as PostgreSQL Ledger

    Analyst->>API: POST /api/predict (amount, location, velocity, device, ip)
    Note over API: Start high-resolution perf_counter timer
    API->>FE: Transform raw features to normalized vector
    FE-->>API: Preprocessed feature array X (preprocessing_ms)
    
    API->>XGB: predict_proba(X)
    XGB-->>API: P(Fraud) = 0.947

    API->>IF: score_anomaly(X)
    IF-->>API: Anomaly Score = 0.782

    API->>RE: Evaluate combined signals + rules
    RE-->>API: Risk Score = 91.2/100, Level: CRITICAL, Verdict: BLOCK

    API->>SHAP: explain_instance(X)
    SHAP-->>API: Local attribution factors (+amount, +velocity, -home_dist) (shap_ms)

    API->>DB: Persist Transaction, Prediction, and Automated Alert
    Note over API: Stop perf_counter timer (total_ms)

    API-->>Analyst: PredictResponse (Scores, SHAP factors, Decision, Real Timings)
```

---

## 3. Asynchronous Heavy Job Execution (Celery + Redis)

For large batch CSV processing and model retraining, tasks are handled asynchronously so HTTP connections never timeout:

```mermaid
sequenceDiagram
    autonumber
    actor User as Analyst / Admin
    participant API as FastAPI Gateway
    participant DB as PostgreSQL Database
    participant Broker as Redis Message Broker
    participant Worker as Celery Distributed Worker

    User->>API: POST /api/predict/batch (Upload 50MB CSV)
    API->>DB: Create BackgroundJob record (status: QUEUED, progress: 0%)
    API->>Broker: Enqueue process_batch_csv_task(job_id, file_path)
    API-->>User: 202 Accepted { job_id: "JOB-XXXXXXXX", status: "QUEUED" }

    Worker->>Broker: Fetch task
    Worker->>DB: Update BackgroundJob (status: RUNNING, progress: 20%)
    Worker->>Worker: Validate CSV schema & run vectorized batch inference
    Worker->>DB: Update BackgroundJob (status: RUNNING, progress: 80%)
    Worker->>Worker: Save sanitized enriched CSV with formula-injection defenses
    Worker->>DB: Update BackgroundJob (status: COMPLETED, progress: 100%, result: {...})

    loop Periodic Status Polling
        User->>API: GET /api/jobs/{job_id}
        API->>DB: Fetch job status
        API-->>User: 200 OK { status: "COMPLETED", progress: 100, download_url: "..." }
    end
```

---

## 4. Multi-Container Production Topology

```
                  INTERNET
                     │
                     ▼
        Reverse Proxy: Nginx (Port 80/443)
          │                      │
          │ /api/*               │ Static HTML/JS
          ▼                      ▼
  FastAPI Backend         React 18 + Vite SPA
  Container               Container
    │         │
    │         │ Enqueue Tasks
    ▼         ▼
PostgreSQL   Redis 7
Database     Message Broker
    │         │
    │         ▼
    └──── Celery Background
          Worker Container
```
