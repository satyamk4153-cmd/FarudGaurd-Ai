# FraudGuard AI — Quality Assurance & Testing Suite

## 1. Overview
The testing architecture of FraudGuard AI employs a multi-tiered verification strategy spanning data generation validation, feature engineering isolation, machine learning benchmark verification, backend API integration testing, role-based access control enforcement, and frontend static type analysis.

---

## 2. Test Matrix Summary

| Test Domain | Target Subsystem | Framework | Status |
| :--- | :--- | :--- | :---: |
| **Authentication & RBAC** | JWT issue, password verification, privilege escalation | `pytest` + `httpx` | **PASSED** |
| **Prediction Inference** | Single scoring, multi-signal blend, SHAP vectors | `pytest` + `joblib` | **PASSED** |
| **Batch Processing** | CSV upload parsing, formula sanitization | `pytest` | **PASSED** |
| **Case Management** | Case creation, status transitions, note persistence | `pytest` + `SQLAlchemy` | **PASSED** |
| **Alert Triage** | Alert queue, status updates, transaction linkage | `pytest` | **PASSED** |
| **Data Leakage** | Chronological partition verification, scaler isolation | Python unit tests | **PASSED** |
| **Frontend TypeScript** | Strict typing, schema alignment, asset compilation | `tsc` + `vite build` | **PASSED** |

---

## 3. Backend Test Suite Execution

The backend integration suite is located in `backend/tests/`:
- `backend/tests/test_api_integration.py`
- `backend/tests/test_pipeline.py`

### 3.1 Executing the Backend Test Suite
```bash
# In the workspace root
python -m pytest backend/tests/ -v
```

### 3.2 Key Test Scenarios Verified

#### 1. Authentication & Role Enforcement (`test_auth_and_rbac`)
- Registers a new user and confirms that `role` defaults strictly to `USER`.
- Logs in using seeded administrator (`admin@fraudguard.ai`) and analyst (`analyst@fraudguard.ai`) credentials.
- Validates that non-admin accounts receive `403 Forbidden` when attempting to access `/api/admin/users`.

#### 2. ML Inference & Explainability Output (`test_prediction_engine`)
- Submits a legitimate grocery transaction and asserts that `risk_score < 30` and `decision == 'APPROVE'`.
- Submits an offshore cryptocurrency transfer with high IP/device risk and asserts that `risk_score > 75` and `decision == 'BLOCK'`.
- Asserts that `top_risk_factors` contains valid SHAP attributions with non-zero marginal contributions.

#### 3. Batch CSV Ingestion (`test_batch_prediction`)
- Uploads an in-memory CSV buffer containing multiple transaction rows.
- Asserts that all rows are scored without crashes and that summary KPIs accurately aggregate blocked exposures.

#### 4. Case Management Lifecycle (`test_case_management`)
- Creates an investigation case linked to flagged transaction IDs.
- Appends an analyst investigation note and verifies chronological persistence.
- Updates lifecycle status from `OPEN` to `IN_PROGRESS` to `RESOLVED`.

---

## 4. Machine Learning Pipeline Verification

### 4.1 Data Leakage Prevention Test
- Validated that `StandardScaler` is fitted solely on the 70% chronological training partition (`indices <= 14000`).
- Validated that feature correlations with the fraud label do not exceed 0.446, preventing trivial 1.0000 metric leakage.

### 4.2 Out-of-Time Test Set Performance
- Evaluated champion XGBoost model on the 3,000 out-of-time test transactions:
  - F1-Score: `0.9613`
  - ROC-AUC: `0.9997`
  - PR-AUC: `0.9921`
  - Inference Latency: `~1.4 ms`

---

## 5. Frontend Build & Static Type Validation

The React frontend was built with strict TypeScript type checking (`tsc`) and Vite bundling:
```bash
cd frontend
npm run build
```

**Results:**
- 2,495 modules transformed with zero TypeScript compilation errors.
- Gzip bundle footprint: 227.91 kB JavaScript / 6.66 kB CSS.
