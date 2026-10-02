# FraudGuard AI — User Guide & Operational Walkthrough

## 1. Introduction
Welcome to **FraudGuard AI**, an enterprise-grade financial fraud detection, risk analytics, and investigation platform. This walkthrough provides step-by-step guidance for examiners, fraud analysts, risk officers, and administrators.

---

## 2. Authentication & Access Profiles
Navigate to `/login` to sign in. For rapid evaluation and viva demonstration, one-click quick credential buttons are provided on the login card:
1. **Admin Persona (`admin@fraudguard.ai` / `Admin@123456`):** Full access including model governance, user management, and audit logs.
2. **Analyst Persona (`analyst@fraudguard.ai` / `Analyst@123456`):** Day-to-day risk operations, alert triage, transaction forensics, and casefile logging.
3. **Viewer Persona (`user@fraudguard.ai` / `User@123456`):** Standard access to dashboards and scoring simulators.

---

## 3. Platform Modules & Guided Walkthrough

### 3.1 Risk Operations Dashboard (`/dashboard`)
- **Key Metrics:** Inspect total volume processed, fraud rates, blocked dollar exposure, pending alert backlogs, and active casefiles.
- **Visual Analytics:** Review daily transaction volume vs fraudulent velocity trends over time, portfolio risk tier distributions (donut chart), high-risk merchant category rankings, and geographic hotspots.
- **Quick Alert Preview:** Inspect recent critical alerts requiring triage.

### 3.2 Real-Time Transaction Scoring & SHAP Explainability (`/analyze`)
- **Interactive Workbench:** Test single transaction scoring with live parameters (amount, category, velocity, IP/device risk scores).
- **Curated Scenario Profiles:** Select from 4 pre-configured profiles:
  - *Legitimate Grocery Purchase* (low score, approved)
  - *Suspicious Cross-Border Crypto* (critical score, blocked)
  - *Velocity Burst Attack* (high score, flagged)
  - *International Luxury Travel* (medium score, review)
- **Multi-Signal Verdict:** View the semicircular risk gauge (0–100), decision badge (`APPROVE`, `REVIEW`, `BLOCK`), latency in milliseconds, and the formula breakdown (supervised 55%, anomaly 25%, behavioral 20%).
- **SHAP Waterfall Attribution:** Examine the exact feature contributions with green/red bars showing which specific variables increased or decreased fraud probability.

### 3.3 Transaction Ledger & Forensic Dossier (`/transactions`)
- **Query Filters:** Search transactions by ID, User, City, Merchant, or filter by Risk Tier, Decision, and Transaction Type.
- **Export CSV:** Click "Export CSV" to download the filtered dataset with formula injection sanitization.
- **Forensic Dossier (`/transactions/:id`):** Click on any transaction to open its deep forensic view. Inspect comprehensive hardware telemetry, model confidence, and click "Escalate to Case" to open an investigation.

### 3.4 Batch Processing Workbench (`/batch-analysis`)
- **CSV Ingestion:** Upload bulk transaction CSV files for parallel inference.
- **Template Download:** Download `fraudguard_batch_template.csv` to inspect expected input columns.
- **Batch Results:** View summary cards (Approved, Review, Blocked, Exposure at Risk) and export the enriched CSV containing model probabilities and triggered safeguard rules.

### 3.5 Live Stream Monitor (`/live-monitor`)
- **Streaming Telemetry:** Connects to the backend WebSocket bus (`/ws/live-transactions`), displaying simulated live transactions with sub-second arrival times.
- **Stream Controls:** Pause and resume the feed, filter for high-risk and blocked transactions only, and track live counters.

### 3.6 Fraud Alert Triage (`/alerts`)
- **Triage Inbox:** Filter alerts by status (`PENDING`, `UNDER_REVIEW`, `RESOLVED`, `ESCALATED`, `FALSE_POSITIVE`) and severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Triage Action:** Click "Triage" on any alert to transition its status and record internal analyst rationale.

### 3.7 Incident Case Management (`/investigations`)
- **Formal Incidents:** Organize suspicious transaction clusters into unified cases.
- **Case Dossier (`/investigations/:id`):** Inspect total exposure at risk, linked transaction IDs, and append chronological analyst findings in the interactive case log.

### 3.8 Model Governance & Champion Promotion (`/models`)
- **Candidate Benchmark:** Compare performance metrics (F1-Score, ROC-AUC, PR-AUC, Precision, Recall, P95 Latency) across XGBoost, LightGBM, Random Forest, and Logistic Regression.
- **Confusion Matrices:** Inspect out-of-time test set true positives, false declines, and missed fraud.
- **Promote Champion:** One-click promotion to deploy any shadow model to live production.

### 3.9 Observability & PSI Drift Tracking (`/monitoring`)
- **System Health:** Track average, P95, and P99 inference latencies, memory footprint, and active model status.
- **PSI Drift Detection:** Review Population Stability Index (PSI) values across all 27 features to detect concept drift before performance degrades. Click "Run PSI Drift Check" to recalculate.

### 3.10 Grounded Analyst Copilot (`/copilot`)
- **Grounded Q&A:** Chat with an AI assistant that queries the live database and ML explainability tables to answer complex investigative inquiries without hallucinations.

### 3.11 Admin Console (`/admin`)
- **User Provisioning:** Manage user accounts, elevate roles between `USER`, `ANALYST`, and `ADMIN`, or deactivate accounts.
- **Security Audit Logs:** Inspect an immutable audit trail of all sensitive operations across the platform.
