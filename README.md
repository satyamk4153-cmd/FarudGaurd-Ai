# FraudGuard AI — Financial Fraud Risk Analytics & Investigation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-Champion%20v1-FF6600.svg)](https://xgboost.ai)
[![SHAP](https://img.shields.io/badge/SHAP-TreeExplainer-4B0082.svg)](https://shap.readthedocs.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Celery](https://img.shields.io/badge/Celery-5.6-37814A.svg?logo=celery&logoColor=white)](https://docs.celeryq.dev)

FraudGuard is an explainable machine-learning-based financial fraud risk analytics and investigation platform with anomaly detection, model governance, and a grounded Google Gemini analyst assistant.

---

## 1. Two-Layer AI Architecture Invariant

FraudGuard strictly bifurcates its artificial intelligence responsibilities into two distinct, decoupled layers:

### Layer 1: Core Fraud Intelligence (Authoritative Decision Engine)
- **Technologies:** XGBoost (Champion), LightGBM, Random Forest, Logistic Regression, Isolation Forest, SHAP.
- **Responsibilities:** Evaluates feature vectors, computes fraud probabilities, scores unsupervised anomalies, calculates composite risk indices (0–100), and outputs exact Shapley feature attributions.
- **Rule:** **Determines all fraud probabilities and decisions.** Gemini never calculates fraud probability and never overrides the ML model.

### Layer 2: Generative Analyst Assistant (Google Gemini Copilot)
- **Technologies:** Google Gemini API (`google-genai` official Python SDK) with 16 safe read-only backend tools.
- **Responsibilities:** Answers analyst queries in natural language, drafts investigation case summaries, retrieves forensic transaction dossiers, explains model metrics, and renders grounded evidence cards.
- **Rule:** **Read-only analyst assistance only.** Does not execute arbitrary SQL, does not perform database writes, and does not alter permissions or roles.

---

## 2. Key Benchmarks & Engineering Highlights

- **Champion ML Performance:** Evaluated on an out-of-time test set: **0.9613 F1-Score**, **0.9997 ROC-AUC**, **0.9921 PR-AUC** at an mathematically optimized decision threshold ($\tau = 0.75$).
- **Sub-10ms Inference Pipeline:** In-memory pre-warmed model singleton measuring genuine pipeline latencies (`preprocessing_ms`, `inference_ms`, `shap_ms`, `total_ms`) without synthetic timers.
- **Supports Explainability and Analyst Transparency:** Every single transaction decision is backed by mathematical local SHAP feature attributions providing clear decision visibility for investigators.
- **Grounded Gemini Assistant:** Communicates through 16 safe, read-only tools (`get_transaction`, `get_shap_explanation`, `get_highest_risk_transactions`, etc.) with prompt injection defenses and automated fallback to `MockGeminiClient`.
- **Asynchronous Heavy Processing:** Celery + Redis distributed worker pool handling large batch CSV processing, model retraining, and population drift calculations with status polling (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`).
- **Enterprise Persistence & Migrations:** Full support for **PostgreSQL 16** with SQLAlchemy connection pooling in production and zero-dependency SQLite in local development, versioned through **Alembic**.
- **Security Hardening:** Bcrypt password hashing (work factor 12), PyJWT tokens with production entropy validation, strict public signup restrictions (USER only, no privilege escalation), CSV formula injection defenses, and defensive HTTP security headers (`nosniff`, `DENY`).

---

## 3. High-Level Architecture

```
                 CLIENT / ANALYST BROWSER
                            │
                            ▼
              Reverse Proxy: Nginx (Port 80/443)
              ┌─────────────┴─────────────┐
              │ Static SPA                │ /api/* & /ws/*
              ▼                           ▼
      React 18 + Vite               FastAPI Gateway
     (Vanilla CSS / Tailwind)     (Python 3.12 Core)
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
          [ Layer 1: Core ML ]    [ Infrastructure ]    [ Layer 2: Copilot ]
          - Feature Scaler        - PostgreSQL 16 DB    - Google Gemini 2.5
          - XGBoost Champion      - Redis 7 Broker      - 16 Read-Only Tools
          - Isolation Forest      - Celery Workers      - Forensic Evidence
          - SHAP Explainer        - Alembic Migrations  - Strict Grounding
```

---

## 4. Quick Start (Local Development)

### Prerequisites
- Python 3.10+ (Tested on Python 3.12)
- Node.js 18+ (Tested on Node.js v20/v24)
- Git

### 1. Backend Setup
```bash
# Clone repository
git clone https://github.com/raghavbhatnagar2207/FRAUDGUARD-AI.git
cd FRAUDGUARD-AI

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run database migrations
python scripts/migrate.py

# Seed demo users and baseline transaction records (LOCAL DEMO ONLY)
python scripts/seed_demo_data.py

# Launch FastAPI server
python scripts/start_app.py
```
- API Docs: `http://127.0.0.1:8000/docs`
- Healthcheck: `http://127.0.0.1:8000/health`
- Deep Readiness: `http://127.0.0.1:8000/ready`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 5. Production Multi-Container Docker Deployment

The platform is orchestrated via `docker-compose.yml`:

```bash
# 1. Prepare environment variables
cp .env.example .env
# Set strong POSTGRES_PASSWORD, JWT_SECRET_KEY, and optional GEMINI_API_KEY in .env

# 2. Build and launch all services in detached mode
docker compose up --build -d

# 3. Check health and running status
docker compose ps
```

Services provisioned:
- `fraudguard-frontend`: Nginx serving optimized React 18 production bundle (Port 80)
- `fraudguard-backend`: FastAPI application and ML inference gateway (Internal Port 8000)
- `fraudguard-postgres`: PostgreSQL 16 database (Internal Port 5432, not published publicly)
- `fraudguard-redis`: Redis 7 message broker and cache (Internal Port 6379, not published publicly)
- `fraudguard-worker`: Celery distributed background worker container

---

## 6. Evaluation & Viva Demo Accounts (LOCAL DEMO ONLY)

> [!NOTE]
> These credentials are generated by the local seed script (`scripts/seed_demo_data.py`) exclusively for local development, academic viva, and demonstration purposes. In production environments, credentials must be generated securely and never shared.

| Role | Email | Password | Permissions & Purpose |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@fraudguard.ai` | `Admin@123456` | Model governance, user role elevation, audit logs |
| **Fraud Analyst** | `analyst@fraudguard.ai` | `Analyst@123456` | Transaction forensics, alert triage, investigation cases |
| **Viewer / User** | `user@fraudguard.ai` | `User@123456` | Read-only dashboard, real-time transaction scoring |

---

## 7. Verification & Automated Test Suites

```bash
# Run backend pytest suite (21 unit, integration, and security tests)
python -m pytest backend/tests/ -v

# Run frontend Vitest suite (15 unit tests)
cd frontend && npm test

# Run frontend TypeScript typecheck
cd frontend && npm run typecheck

# Run full frontend production build
cd frontend && npm run build

# Run API & reverse proxy integration verification suite (60 passed checks)
node scripts/api_integration_verification.mjs
```

---

## 8. Complete Project Documentation

- [Release Candidate Audit & Verification Report](docs/final-release-audit.md)
- [Gemini Analyst Copilot & Generative AI Architecture](docs/gemini-copilot.md)
- [Final System Architecture & Diagrams](docs/final-architecture.md)
- [Viva & Technical Defense Preparation (22 Questions & Answers)](docs/viva-notes.md)
- [Production Deployment & Disaster Recovery Operations](docs/deployment.md)
- [Security Architecture & Hardening Guide](docs/security.md)
- [Machine Learning & Explainability Pipeline](docs/ml-pipeline.md)
- [Database Schema & Data Dictionary](docs/database.md)

---

## 9. Regulatory & Legal Disclaimer

*FraudGuard is an explainable machine-learning-based financial fraud risk analytics and investigation platform with anomaly detection, model governance, and a grounded Google Gemini analyst assistant. It is designed for educational, research, and portfolio demonstration purposes. It is not bank-certified, PCI-DSS certified, or regulator-approved, and is not suitable for handling live customer banking financial data without independent security, operational, and regulatory compliance audits.*
# FarudGaurd-Ai
