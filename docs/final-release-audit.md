# FraudGuard AI — Final Pre-GitHub Release Audit Report

**Date:** September 2026  
**Auditor:** Principal Software & Security Engineering Audit Pass  
**Repository Target:** `raghavbhatnagar2207/FRAUDGUARD-AI`  
**Classification:** Pre-Release Verification & Hardening Ledger  

---

## Executive Summary

FraudGuard is an explainable machine-learning-based financial fraud risk analytics and investigation platform with anomaly detection, model governance, and a grounded Google Gemini analyst assistant.

This forensic pre-release audit examined the codebase line-by-line across all layers to ensure security, data integrity, machine learning validity, deployment readiness, and documentation truthfulness prior to publishing to GitHub.

---

## 1. Security & Credentials Audit

| Area | Item | Status | Details |
| :--- | :--- | :---: | :--- |
| **Secrets Exposure** | Hardcoded API keys (`AIza...`) | **FIXED** | Compromised development key removed from `.env.example`. Full repository grep verified zero occurrences. `.env.example` now contains only safe placeholder `GEMINI_API_KEY=your-gemini-api-key`. |
| **Client Exposure** | Gemini Key in Frontend | **VERIFIED** | React frontend has zero access to `GEMINI_API_KEY`. All Gemini operations are brokered exclusively through the authenticated FastAPI backend. |
| **Authentication** | Password Hashing | **VERIFIED** | Bcrypt with work factor 12 implemented in `backend/app/security/password.py`. Plaintext passwords are never stored in databases or logs. |
| **Authentication** | JWT Tokens & Entropy | **VERIFIED** | PyJWT with HS256 algorithm. Production mode validates minimum 32-character secret and rejects default development markers. |
| **Authorization** | Public Registration RBAC | **VERIFIED** | Public registration (`POST /api/auth/register`) enforces `UserRole.USER`. Privilege escalation to `ADMIN` or `ANALYST` is impossible via public API. |
| **CORS Policy** | Allowed Origins | **VERIFIED** | Configurable via `CORS_ORIGINS`. Production validator explicitly raises fatal error if wildcard `*` origin is specified. |
| **HTTP Security Headers** | Browser Defenses | **VERIFIED** | Middleware injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and conditional `Strict-Transport-Security` in production. |
| **CSV Security** | Formula Injection Defense | **VERIFIED** | Export transactions sanitizes cells starting with `=`, `+`, `-`, `@` by prepending `'` to disarm spreadsheet formula execution. |
| **File Uploads** | Batch CSV Ingestion | **VERIFIED** | Checks `.csv` extension, enforces 50MB ceiling, validates schema via `DatasetValidator`, and rejects executable uploads. |
| **Network Isolation** | Docker Compose Ports | **VERIFIED** | Postgres (5432), Redis (6379), and Backend (8000) are unmapped publicly (`expose` only). Only Nginx Frontend is published to port 80. |

---

## 2. Machine Learning & Analytics Data Integrity

| Area | Item | Status | Details |
| :--- | :--- | :---: | :--- |
| **Two-Layer Invariant** | ML vs Gemini Separation | **VERIFIED** | Supervised model (XGBoost) and unsupervised model (Isolation Forest) strictly calculate all fraud probabilities and decisions. Gemini never calculates fraud probability and never overrides ML output. |
| **Fake Multipliers** | Hardcoded Amount Formulas | **FIXED** | Removed artificial multipliers (`* 350`, `* 2500`, `* 180`, `* 320`) from `frontend/src/api/client.ts`. Backend `DashboardService` updated to execute real SQL sum aggregations (`func.sum(Transaction.amount)`) for total volume and fraud amount. |
| **Fake Case Amounts** | Default Risk Exposure | **FIXED** | Removed hardcoded fallback `|| 3450.0` from investigation case endpoints. Case amount now reflects authentic sum of linked transaction amounts. |
| **Latency Integrity** | Hardcoded Latency Values | **FIXED** | Removed fabricated values (`1.4ms`, `1.42ms`). Pipeline records authentic high-resolution timings via `time.perf_counter()` (`preprocessing_ms`, `inference_ms`, `shap_ms`, `total_ms`). Batch tasks measure genuine elapsed processing time. |
| **Model Metrics UI** | Hardcoded Metric Fallbacks | **FIXED** | Removed fake defaults (`0.9613`, `0.9997`, `0.9921`) from runtime fallbacks in `copilot_tools.py` and `gemini_client.py`. UI and Copilot display `Unavailable` or `null` if no persisted model evaluation record exists. |
| **Model Registry** | Active Champion Governance | **VERIFIED** | Exactly one model is marked `ACTIVE` at any time (`ml/artifacts/model_registry.json`). Evaluation store persists validated test metrics across splits. |
| **Data Leakage** | Feature Pipeline Hygiene | **VERIFIED** | Strict chronological temporal split. No target encoding or future target leakage in feature engineering. Missing categorical features safely impute defaults without pipeline crashes. |

---

## 3. Gemini Copilot Architecture & Tools

| Area | Item | Status | Details |
| :--- | :--- | :---: | :--- |
| **SDK Integration** | Official Google GenAI SDK | **VERIFIED** | Uses `google-genai` official Python library (`RealGeminiClient`). Fully decoupled from legacy `google-generativeai`. |
| **Read-Only Tools** | Tool Inventory (16 Tools) | **VERIFIED** | 16 discrete read-only tools registered in `backend/app/services/copilot_tools.py` and declarations matching documentation: `get_transaction`, `search_transactions`, `get_highest_risk_transactions`, `get_alerts`, `get_alert_summary`, `get_investigation`, `get_investigation_timeline`, `get_model_information`, `get_model_metrics`, `get_dataset_summary`, `get_dashboard_summary`, `get_fraud_trends`, `get_risk_distribution`, `get_related_transactions`, `get_entity_relationships`, `get_shap_explanation`. |
| **Provider Transparency**| Honest Status Indication | **VERIFIED** | Endpoints and UI return explicit `provider` (`"gemini"` or `"grounded-fallback"`) and `mode` (`"live"` or `"fallback"`). UI header honestly indicates `Gemini Copilot — Live` or `Analyst Copilot — Local Fallback`. Fallback is never disguised as live output. |
| **Prompt Injection** | Security Defenses | **VERIFIED** | Guardrails block attempts to leak system prompts, dump API keys, elevate roles, or alter case statuses. Tested and passing in `backend/tests/test_gemini.py`. |

---

## 4. Backend & Database Engineering

| Area | Item | Status | Details |
| :--- | :--- | :---: | :--- |
| **Database Migrations** | Alembic Versioning | **VERIFIED** | Initial schema migration (`19233e341367_initial_schema.py`) and background jobs migration (`b1a2c3d4e5f6_add_background_jobs_table.py`) fully define schema. Application startup never drops tables or runs silent `create_all()`. |
| **Dual DB Support** | PostgreSQL & SQLite | **VERIFIED** | Full PostgreSQL connection pooling configured with SQLite fallback for local zero-dependency testing. |
| **Dedicated Scripts** | Decoupled Lifecycle Operations | **VERIFIED** | Dedicated operational scripts provided: `scripts/migrate.py`, `scripts/seed_demo_data.py`, and `scripts/start_app.py`. |
| **Worker Architecture** | Celery + Redis Batch Pipeline | **VERIFIED** | Long-running CSV predictions immediately create and return `job_id` (`QUEUED`/`RUNNING`). Asynchronous Celery worker executes inference, aggregates authentic totals, and updates status to `COMPLETED` or `FAILED`. |
| **WebSocket Telemetry** | Real-time Streaming | **VERIFIED** | `/ws/live-transactions` provides real-time transaction streaming with automatic reconnection logic on frontend and Nginx upgrade proxying. |

---

## 5. Frontend UI/UX & Data Flow

| Area | Item | Status | Details |
| :--- | :--- | :---: | :--- |
| **Fintech Aesthetics** | Professional Operations Look | **VERIFIED** | High-density enterprise layout; zero AI novelty tropes (no neon gradients, no robot illustrations, no glassmorphism overload). Color palette aligned with slate/navy fintech standards. |
| **Demo Password Security**| Plaintext Password Removal | **FIXED** | Removed hardcoded passwords from `frontend/src/pages/LoginPage.tsx`. Role buttons now select demo email addresses only; credentials labeled `LOCAL DEMO ONLY`. |
| **API Client** | Centralized API Layer | **VERIFIED** | All requests route through `frontend/src/api/client.ts` with Axios interceptors managing Bearer tokens and unified 401 redirect handling. |
| **Production Build** | TypeScript & Vite Bundling | **VERIFIED** | `npm run typecheck` passes with 0 errors. `npm test` passes 15/15 unit tests. Production build outputs minified, gzip-optimized chunks cleanly into `dist/`. |

---

## 6. Verification Status Matrix

| Component | Status | Test / Command | Results |
| :--- | :---: | :--- | :--- |
| **Backend Tests** | **VERIFIED** | `python -m pytest backend/tests/ -v` | 21 passed / 21 total (100%) |
| **Frontend Unit Tests**| **VERIFIED** | `npm test` | 15 passed / 15 total (100%) |
| **TypeScript Typecheck**| **VERIFIED** | `npm run typecheck` | 0 errors |
| **Frontend Build** | **VERIFIED** | `npm run build` | 2,499 modules transformed, built in ~12s |
| **API Integration** | **VERIFIED** | `node scripts/api_integration_verification.mjs` | 60 passed / 60 total (100%) |
| **WebSocket Streaming**| **VERIFIED** | Python WebSocket subscriber script | Verified active transaction broadcast |
| **Docker Compose** | **VERIFIED** | `docker-compose.yml` config inspection | Validated internal networks, fail-fast env vars |
| **Public Cloud Deployment** | **NOT VERIFIED** | AWS ECS / GCP Cloud Run / Kubernetes | Not performed; tested and verified locally and via Docker Compose |

---

## 7. Known Limitations & Scope Boundaries

1. **Cloud Cluster Deployment:** Production configuration has been validated containerized via Docker Compose. Multi-region managed Kubernetes (EKS/GKE) deployment has not been executed.
2. **Real Banking Certifications:** FraudGuard is not certified by PCI-DSS, bank regulators, or card network compliance bodies. It is designed for educational, research, and portfolio demonstrations.
3. **Third-Party Model Drift:** Feature drift detection (PSI) currently relies on batch comparisons against baseline distributions rather than real-time streaming feature stores like Feast.
4. **Gemini Live Key Requirement:** Operating in `mode: "live"` requires a valid Google AI Studio API key provided via environment variable. In environments without an active key, the system defaults automatically and transparently to `mode: "fallback"`.
