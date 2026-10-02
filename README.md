# FraudGuard AI — Financial Fraud Risk Analytics & Investigation Platform

[![CI/CD](https://github.com/raghavbhatnagar2207/FRAUDGUARD-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/raghavbhatnagar2207/FRAUDGUARD-AI/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-Champion%20v1-FF6600.svg)](https://xgboost.ai)
[![SHAP](https://img.shields.io/badge/SHAP-TreeExplainer-4B0082.svg)](https://shap.readthedocs.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6.1-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)

FraudGuard is an explainable machine-learning financial fraud risk analytics and investigation platform. It combines a multi-model ML ensemble, SHAP explainability, anomaly detection, model governance, and a grounded Google Gemini analyst assistant.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Running on a Fresh Computer — Step-by-Step](#running-on-a-fresh-computer--step-by-step)
4. [Environment Variables](#environment-variables)
5. [Database Initialization & Migrations](#database-initialization--migrations)
6. [ML Model Setup](#ml-model-setup)
7. [Running the Application](#running-the-application)
8. [Running Tests](#running-tests)
9. [Docker Setup](#docker-setup)
10. [Demo Accounts](#demo-accounts)
11. [Common Errors & Solutions](#common-errors--solutions)
12. [CI/CD Pipeline](#cicd-pipeline)

---

## Architecture

```
          CLIENT / ANALYST BROWSER
                      │
                      ▼
        Reverse Proxy: Nginx (Port 80/443)
        ┌─────────────┴─────────────┐
        │ Static SPA                │ /api/* & /ws/*
        ▼                           ▼
React 18 + Vite               FastAPI Gateway
(TypeScript / Vanilla CSS)    (Python 3.12 Core)
                                      │
            ┌─────────────────────────┼───────────────────────┐
            ▼                         ▼                       ▼
  [ Layer 1: Core ML ]     [ Infrastructure ]     [ Layer 2: Copilot ]
  - Feature Scaler          - PostgreSQL 16 DB     - Google Gemini 2.5
  - XGBoost Champion        - Redis 7 Broker       - 16 Read-Only Tools
  - Isolation Forest        - Celery Workers       - Forensic Evidence
  - SHAP Explainer          - Alembic Migrations   - Strict Grounding
```

**Key design rule:** Layer 1 (XGBoost + Isolation Forest) exclusively produces all fraud probabilities. Layer 2 (Gemini Copilot) only reads data via 16 safe backend tools and never executes SQL writes or alters roles.

---

## Prerequisites

| Requirement | Minimum | Tested With |
|---|---|---|
| Python | 3.10 | 3.12, 3.13 |
| Node.js | 18 | 20, 24 |
| Git | Any | — |
| Docker + Docker Compose | Optional | Docker Desktop 4.x |

> **Windows users:** Use PowerShell or Git Bash. The project is fully portable across Windows and Linux.

---

## Running on a Fresh Computer — Step-by-Step

### Step 1 — Clone the repository

```bash
git clone https://github.com/satyamk4153-cmd/FarudGaurd-Ai.git
cd FarudGaurd-Ai
```

### Step 2 — Backend setup

```powershell
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

```bash
pip install -r backend/requirements.txt
```

> **Important:** `requirements.txt` pins `scikit-learn==1.6.1`. This version must match the serialized model artifacts in `ml/artifacts/`. Do not upgrade scikit-learn without retraining the models.

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
- Set `JWT_SECRET_KEY` to any random 32+ character string for local dev.
- Leave `GEMINI_API_KEY` empty to use the deterministic mock Copilot (fully functional without a key).
- Leave `DATABASE_URL` as the default SQLite path for local development.

### Step 4 — Initialize the database

```bash
# Run Alembic migrations + create schema
python scripts/migrate.py

# Seed demo users (admin/analyst/user), 2500 synthetic transactions, ML scores, alerts
python scripts/seed_demo_data.py
```

This creates `fraudguard.db` in the project root with all demo data.

### Step 5 — Frontend setup

```bash
cd frontend
npm install
cd ..
```

### Step 6 — Start the application

**Backend (Terminal 1):**
```bash
python scripts/start_app.py
```
- API Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
- Readiness: http://127.0.0.1:8000/ready

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
- Web UI: http://localhost:5173

---

## Environment Variables

All environment variables are documented in [`.env.example`](.env.example). Key variables:

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | `development` or `production` |
| `DATABASE_URL` | `sqlite:///./fraudguard.db` | SQLite (dev) or PostgreSQL URL (prod) |
| `JWT_SECRET_KEY` | *(must set)* | Min 32 chars. Enforced in production. |
| `GEMINI_API_KEY` | `""` | Leave blank to use MockGeminiClient (no real API calls) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `MODEL_DIRECTORY` | `ml/artifacts` | Path to `.joblib` model artifacts |
| `REDIS_URL` | `redis://localhost:6379/0` | Required for Celery batch jobs |
| `CORS_ORIGINS` | *(localhost ports)* | Comma-separated allowed origins |

> **Security note:** Never commit a real `.env` file. The `.gitignore` excludes `.env` and all `*.db` files. Only `.env.example` is committed.

---

## Database Initialization & Migrations

FraudGuard uses **Alembic** for schema versioning and supports both SQLite (development) and PostgreSQL (production).

```bash
# Apply all pending migrations
python scripts/migrate.py

# Or directly via Alembic
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"
```

On a fresh database, the app automatically:
1. Creates all tables via Alembic migrations.
2. Seeds feature metadata.
3. Seeds the champion `ModelVersion` record from `ml/artifacts/model_registry.json`.
4. Seeds demo users (via `seed_demo_data.py`).

---

## ML Model Setup

Pre-trained model artifacts are committed to the repository under `ml/artifacts/`:

| File | Description |
|---|---|
| `xgboost_v1.joblib` | Champion XGBoost fraud classifier (99.97% ROC-AUC) |
| `lightgbm_v1.joblib` | Challenger LightGBM model |
| `randomforest_v1.joblib` | Random Forest ensemble |
| `logisticregression_v1.joblib` | Logistic Regression baseline |
| `isolation_forest_v1.joblib` | Unsupervised anomaly detector |
| `scaler.joblib` | StandardScaler for feature normalization |
| `shap_explainer.joblib` | SHAP TreeExplainer for local attributions |
| `model_registry.json` | Model manifest (active model, thresholds, metrics) |

> **scikit-learn version:** All `.joblib` artifacts were serialized with **scikit-learn 1.6.1**. The requirements pin this version. If you see `InconsistentVersionWarning`, your scikit-learn version does not match — reinstall: `pip install scikit-learn==1.6.1`.

If model files are missing, the InferenceEngine logs a warning and the `/ready` endpoint returns `"model_engine": "UNAVAILABLE"`. To retrain: `python ml/training/train.py`.

---

## Running Tests

```bash
# Run the full backend pytest suite (29 tests)
python -m pytest backend/tests/ -v

# Run only the two previously failing tests
python -m pytest backend/tests/test_api.py::test_login_and_authenticated_routes \
                   backend/tests/test_gemini.py::test_copilot_tools_read_only_execution -v

# Frontend unit tests (Vitest)
cd frontend && npm test

# Frontend TypeScript typecheck
cd frontend && npm run typecheck

# Frontend production build
cd frontend && npm run build
```

Expected backend results: **29 passed, 0 failed**.

---

## Docker Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env: set JWT_SECRET_KEY, GEMINI_API_KEY (optional), POSTGRES_PASSWORD

# 2. Build and start all services
docker compose up --build -d

# 3. Check service health
docker compose ps
curl http://localhost:8000/health
```

Services:
- `fraudguard-frontend`: Nginx + React SPA (Port 80)
- `fraudguard-backend`: FastAPI + ML engine (Internal 8000)
- `fraudguard-postgres`: PostgreSQL 16 (Internal 5432)
- `fraudguard-redis`: Redis 7 (Internal 6379)
- `fraudguard-worker`: Celery worker

---

## Demo Accounts

> These credentials are seeded by `scripts/seed_demo_data.py` for **local development and demonstration only**. Never use these in production.

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **System Admin** | `admin@fraudguard.ai` | `Admin@123456` | User management, model governance, audit logs |
| **Fraud Analyst** | `analyst@fraudguard.ai` | `Analyst@123456` | Transaction forensics, alert triage, investigations |
| **Viewer** | `user@fraudguard.ai` | `User@123456` | Read-only dashboard, transaction scoring |

---

## Common Errors & Solutions

| Error | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'backend'` | Running pytest without `PYTHONPATH` set | Run from the project root: `python -m pytest backend/tests/` |
| `InconsistentVersionWarning: scikit-learn 1.6.1 vs 1.9.x` | Wrong scikit-learn version | `pip install scikit-learn==1.6.1` |
| `assert 0 >= 3000` in `test_login_and_authenticated_routes` | Empty database in CI | Run `python scripts/seed_demo_data.py` or the conftest now auto-seeds |
| `assert 'algorithm' in {...}` in `test_copilot_tools_read_only_execution` | No `ModelVersion` row in DB | Fixed in `init_db`: champion model is now auto-seeded from `model_registry.json` |
| `UNIQUE constraint failed: transactions.external_transaction_id` | Seeding into a DB that already has transactions | Conftest now uses ID offsets to avoid collisions |
| `InferenceEngine artifacts are not loaded` | Missing `.joblib` files | Check `ml/artifacts/` — all files must be present |
| `Redis connection refused` | Redis not running | Start Redis locally or set `REDIS_URL` to an available instance. Batch jobs require Redis; single predictions do not. |
| `GEMINI_API_KEY not configured` | Missing API key | The app uses `MockGeminiClient` automatically — no key needed for local dev |
| Frontend: `npm ci` fails | Missing `package-lock.json` | Run `npm install` once to generate it |
| `alembic.ini not found` | Running from wrong directory | Always run commands from the repository root |

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`, `master`, or `develop`:

1. **Frontend Validation** — TypeScript typecheck, Vitest unit tests, production build
2. **Backend & ML Testing** — Full pytest suite (29 tests) against a fresh SQLite database
3. **Docker Build Verification** — Builds both backend and frontend Docker images (runs after both above jobs pass)

The backend CI job sets:
- `PYTHONPATH=$GITHUB_WORKSPACE` — ensures `import backend.*` works without installation
- `DATABASE_URL=sqlite:///./fraudguard_test.db` — fresh test database
- `scikit-learn==1.6.1` — pinned to match model artifact serialization version

---

## Complete Project Documentation

- [Gemini Analyst Copilot Architecture](docs/gemini-copilot.md)
- [ML Pipeline & Explainability](docs/ml-pipeline.md)
- [Security Architecture & Hardening](docs/security.md)
- [Database Schema & Data Dictionary](docs/database.md)
- [Production Deployment & Disaster Recovery](docs/deployment.md)

---

## Regulatory Disclaimer

*FraudGuard is an explainable ML-based financial fraud risk analytics platform designed for educational, research, and portfolio demonstration purposes. It is not bank-certified, PCI-DSS certified, or regulator-approved, and is not suitable for handling live customer banking data without independent security, operational, and regulatory compliance audits.*
