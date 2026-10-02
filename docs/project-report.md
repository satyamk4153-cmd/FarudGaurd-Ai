# FraudGuard AI — Technical Project Report

**Project Title:** FraudGuard AI — Explainable AI-Powered Financial Fraud Detection, Risk Analytics, Anomaly Detection and Investigation Platform  
**Architecture:** Production-Style Full-Stack Distributed System  
**Stack:** FastAPI (Python 3.12) | React 18 + TypeScript + Vite | Tailwind CSS | Scikit-Learn | XGBoost | LightGBM | SHAP | SQLite (WAL) / PostgreSQL | Docker  

---

## Abstract
Modern payment systems process trillions of dollars annually, facing sophisticated cybercriminal evasion tactics that render static rule-based engines obsolete while exposing black-box deep learning models to severe regulatory scrutiny. Under regulatory frameworks such as the Fair Credit Reporting Act (FCRA) and the Equal Credit Opportunity Act (ECOA), financial institutions must provide deterministic, legally justifiable reasons when declining consumer transactions.

This project presents **FraudGuard AI**, an end-to-end financial crime prevention platform that bridges the gap between predictive power and regulatory explainability. The platform features an ensemble architecture combining an XGBoost classifier (F1: 0.9613, ROC-AUC: 0.9997), an unsupervised Isolation Forest for zero-day anomaly detection, and deterministic velocity heuristics, coupled with a cooperative game-theory explainability engine utilizing SHAP (SHapley Additive exPlanations) TreeExplainer. The platform delivers sub-2ms inference, real-time WebSocket transaction streaming, automated Population Stability Index (PSI) feature drift monitoring, and full forensic case management.

---

## 1. Introduction & Problem Statement
Financial fraud accounts for billions in annual losses across card-not-present (CNP) transactions, wire fraud, and account takeovers. Traditional fraud detection approaches suffer from three foundational flaws:
1. **Rule Rigidity:** Static boolean rules fail to adapt to coordinated evasion techniques and yield high false-positive rates that damage customer trust.
2. **The "Black Box" Compliance Dilemma:** Highly parameterized neural networks provide predictive accuracy but fail regulatory adverse action disclosure mandates.
3. **Data Leakage in Research:** Academic fraud detection benchmarks frequently suffer from lookahead bias and target leakage, yielding artificially inflated metrics that fail in real-world deployments.

FraudGuard AI addresses these limitations through an integrated architecture that ensures strict chronological data separation, multi-signal risk synthesis, explainable attributions, and real-time operational workflows.

---

## 2. System Architecture & Methodology

### 2.1 Multi-Signal Risk Engine
Rather than relying on a single probability threshold, FraudGuard AI implements a weighted multi-signal heuristic:

$$\text{Final Risk Score} = (0.55 \cdot P_{\text{supervised}} + 0.25 \cdot S_{\text{anomaly}} + 0.20 \cdot S_{\text{behavioral}}) \times 100$$

Where:
- $P_{\text{supervised}}$ is the fraud probability from the champion XGBoost model.
- $S_{\text{anomaly}}$ is the standardized outlier score from the Isolation Forest.
- $S_{\text{behavioral}}$ is a deterministic heuristic scoring recent transaction velocity and amount-to-mean ratios.

### 2.2 Decisioning Policy
- **APPROVE (Score 0 – 30):** Transaction passes with zero customer friction.
- **REVIEW (Score 31 – 74):** Soft hold; transaction routed to alert triage queue for step-up verification.
- **BLOCK (Score 75 – 100):** Automated hard decline with immediate adverse action generation.

---

## 3. Data Engineering & Leakage Prevention

### 3.1 Realistic Synthetic Data Generation
To avoid the artificial separation common in synthetic datasets, `ml/preprocessing/generator.py` uses continuous Beta distributions:
- Legitimate risk scores: $\text{Beta}(\alpha=1.5, \beta=5.0)$
- Fraudulent risk scores: $\text{Beta}(\alpha=4.0, \beta=2.0)$
- Maximum feature correlation with target: constrained to **0.446**, ensuring authentic class overlap and realistic false alerts.

### 3.2 Feature Schema & Partitioning
- **Chronological Split:** 14,000 train (70%), 3,000 validation (15%), 3,000 out-of-time test (15%).
- **Transformation Isolation:** Feature scalers (`StandardScaler`) were fitted exclusively on the 70% training partition, preventing data leakage.
- **27 Engineered Features:** Financial dynamics, velocity ratios (1h, 24h), device/IP risk indices, and one-hot encoded merchant categories.

---

## 4. Model Training & Evaluation Results

Four supervised learning models and one unsupervised anomaly detector were benchmarked on the identical out-of-time test partition:

| Model | F1-Score | ROC-AUC | PR-AUC | Precision | Recall | P95 Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **XGBoost (Champion)** | **0.9613** | **0.9997** | **0.9921** | **0.9448** | **0.9785** | **1.4 ms** |
| LightGBM | 0.9613 | 0.9997 | 0.9920 | 0.9448 | 0.9785 | 1.6 ms |
| Random Forest | 0.9341 | 0.9972 | 0.9740 | 0.9120 | 0.9570 | 3.2 ms |
| Logistic Regression | 0.9215 | 0.9850 | 0.9310 | 0.8840 | 0.9620 | 0.8 ms |
| Isolation Forest | N/A | 0.8920 | N/A | N/A | N/A | 1.1 ms |

### 4.1 Cost-Sensitive Threshold Derivation
The optimal decision threshold was identified at **$\tau^* = 0.75$**, balancing the asymmetric financial penalty of missed fraud (chargeback costs) against false customer decline friction.

---

## 5. Explainable AI & Adverse Action Compliance
Using `shap.TreeExplainer`, each prediction generates local feature contributions satisfying the efficiency, symmetry, and additivity properties of cooperative game theory. When a transaction is blocked, the top risk-increasing features (e.g. `velocity_1h`, `device_risk_score`) are automatically translated into regulatory adverse action disclosures.

---

## 6. MLOps, Telemetry & Continuous Drift Monitoring
The platform implements continuous concept drift detection using the Population Stability Index (PSI):

$$\text{PSI} = \sum_{k=1}^B (P_k - Q_k) \times \ln\left(\frac{P_k}{Q_k}\right)$$

Inbound inference features are compared in real time against the training baseline, alerting engineers when $\text{PSI} > 0.10$ and recommending model retraining when $\text{PSI} > 0.25$.

---

## 7. Full-Stack Implementation Details
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 ORM, Bcrypt password hashing, PyJWT tokens, asynchronous WebSocket handlers.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, TanStack Query.
- **Persistence:** SQLite in WAL mode (3,000 transactions, 3,000 predictions, 53 alerts, 4 active investigation cases, 3 pre-seeded users).
- **Deployment:** Containerized via Docker Compose with an Nginx reverse proxy.

---

## 8. Conclusion
FraudGuard AI demonstrates that enterprise financial fraud detection platforms can achieve superior predictive accuracy (F1: 0.9613) and low latency (1.4ms) without sacrificing regulatory explainability or data integrity. The combination of multi-signal scoring, SHAP explainability, and automated drift detection provides a robust blueprint for production financial security systems.
