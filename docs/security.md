# FraudGuard AI — Security Architecture & Hardening Guide

## 1. Threat Model & Security Philosophy
Financial fraud detection platforms process high-consequence monetary decisions and sensitive user data. FraudGuard AI implements defense-in-depth principles across transport, authentication, access control, data hygiene, and audit logging.

---

## 2. Authentication & Credential Storage

### 2.1 Cryptographic Password Hashing
- **Algorithm:** Bcrypt with adaptive salt generation.
- **Work Factor:** Salt rounds set to 12, defending against GPU-accelerated dictionary and rainbow table attacks.
- **Implementation:** `backend/app/security/password.py` wraps the native C-optimized `bcrypt` library.

### 2.2 Stateless Bearer Tokens (PyJWT) & Secret Enforcement
- **Signature Algorithm:** HMAC-SHA256 (`HS256`).
- **Production Secret Validation:** In production mode (`ENVIRONMENT=production`), the application strictly validates that `JWT_SECRET_KEY` is not default, not an example string, and has at least 32 characters of high-entropy randomness. The server will **refuse to start** if an insecure JWT key is configured.
- **Payload Claims:**
  - `sub`: User ID.
  - `email`: User email address.
  - `role`: Role identifier (`ADMIN`, `ANALYST`, `USER`).
  - `exp`: Expiration epoch timestamp (default: 120 minutes).
- **Transport:** HTTP Authorization header: `Bearer <token>`.

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Strict Registration Safeguards
- **Vulnerability Prevented:** Naive implementations expose a `role` field on public `/api/auth/register` endpoints, allowing unauthenticated attackers to self-provision administrative privileges.
- **Enforcement:** In `backend/app/api/routes/auth.py`, public registration accepts only `UserRegisterRequest` (full name, email, password) and hardcodes `UserRole.USER`. Role elevation is only possible via the protected `/api/admin/users/{id}` endpoint, which requires active `ADMIN` tokens. Automated tests (`test_public_registration_role_escalation_prevented`) verify this boundary continuously.

### 3.2 Role Hierarchy & Capabilities

| Capability | Standard USER | Risk ANALYST | System ADMIN |
| :--- | :---: | :---: | :---: |
| Access Dashboard Analytics | Yes | Yes | Yes |
| Run Real-Time Transaction Scoring | Yes | Yes | Yes |
| Inspect Transaction Forensics | View Only | Full Access | Full Access |
| Triage Fraud Alerts & Update Status | No | Yes | Yes |
| Create & Manage Investigation Cases | No | Yes | Yes |
| Add Analyst Case Notes | No | Yes | Yes |
| Query Grounded Analyst Copilot | Yes | Yes | Yes |
| Benchmarking & Shadow Model Metrics | View Only | View Only | Full Access |
| Promote / Deploy Champion Model | No | No | Yes |
| Trigger Pipeline Retraining | No | No | Yes |
| Elevate User Roles & Manage Accounts | No | No | Yes |
| Inspect Security Audit Logs | No | No | Yes |

---

## 4. HTTP Headers & Transport Security

### 4.1 Production Security Headers
Every HTTP response from FastAPI and the Nginx reverse proxy includes defensive headers:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing attacks.
- `X-Frame-Options: DENY`: Blocks clickjacking attempts across all endpoints.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts sensitive URI leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Disables unneeded browser capabilities.

### 4.2 Cross-Origin Resource Sharing (CORS) Protection
- Production rejects wildcard `*` origins.
- In `backend/app/core/config.py`, setting `CORS_ORIGINS` to `*` or leaving it empty under `ENVIRONMENT=production` throws a startup configuration error.
- Permitted origins must be explicitly enumerated (e.g. `https://fraudguard.domain.com`).

---

## 5. File Upload & Export Hygiene

### 5.1 Batch CSV Upload Security
- **File Extension & MIME Validation:** Rejects non-CSV extensions.
- **Size Bounds:** Enforces strict 50MB ceiling (`MAX_UPLOAD_SIZE_MB`).
- **Storage Isolation:** Uploads are stored in an isolated directory outside the public static root. Files are never marked executable.

### 5.2 CSV Formula Injection Defense
- **Vulnerability:** Unescaped strings in transaction notes starting with `=`, `+`, `-`, or `@` execute formulas in Excel or Google Sheets.
- **Mitigation:** In `backend/app/api/routes/predictions.py` and `transactions.py`, all exported string cells starting with `=`, `+`, `-`, or `@` are prepended with a single quote `'` to disarm formula execution.

---

## 6. Generative AI & Prompt Injection Security

### 6.1 Untrusted Input Segregation
- Database records, transaction remarks, merchant names, and CSV columns are treated as untrusted data that cannot modify Copilot system prompts.
- Gemini is configured with a strict system instruction prohibiting credential disclosure and arbitrary code execution.

### 6.2 Key Confidentiality
- `GEMINI_API_KEY` is confined strictly to backend environment variables.
- Keys are never bundled into client-side JavaScript, Docker images, Git commits, or documentation.
- The `/ready` health endpoint only reports `CONFIGURED`, `NOT_CONFIGURED`, or `ERROR` without disclosing secrets.

---

## 7. Regulatory Audit Logging
- Every high-impact event (e.g., model promotion, alert status modification, case creation, user role change) creates an append-only row in `audit_logs`.
- Recorded telemetry: `timestamp`, `user_id`, `action`, `resource`, `resource_id`, `details_json`, and client `ip_address`.
