# FraudGuard — Financial Risk & Fraud Analytics Frontend

Enterprise-grade banking and risk analytics console built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. Integrated natively with the production FastAPI inference engine, isolation-forest anomaly scoring, TreeExplainer SHAP attributions, and PostgreSQL transactional ledger.

---

## Architecture & Technology Stack

- **Core Framework:** React 18 with TypeScript (strict mode)
- **Build Tool:** Vite 5 (instant HMR and Rollup tree-shaking)
- **Styling:** Tailwind CSS with an enterprise fintech design system (light/dark mode variables, tabular numbers, custom micro-interactions)
- **State & Server Cache:** TanStack Query + React Context (`AuthContext`, `PreferencesContext`)
- **Visualizations:** Recharts (responsive SVG charts with custom tooltip palettes)
- **Icons:** Lucide Icons (Shield, Activity, Database, CheckCircle2, etc.)
- **Real-Time Feed:** Native WebSockets connected to `/ws/live-transactions`

---

## Directory Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # Typed Axios client & REST endpoint contracts
│   ├── components/
│   │   ├── charts/              # Recharts wrappers (KPI trends, risk distribution)
│   │   ├── common/              # Badges (Risk, Decision, Status), Spinners, PageHeader
│   │   └── explainability/      # TreeExplainer SHAP Waterfall chart
│   ├── context/
│   │   ├── AuthContext.tsx      # PyJWT session lifecycle & RBAC permissions
│   │   └── PreferencesContext.tsx # Currency (INR/USD/EUR/GBP), Dark/Light theme, Alert thresholds
│   ├── layouts/
│   │   └── AppLayout.tsx        # Enterprise shell, responsive collapsible sidebar, breadcrumbs
│   ├── pages/
│   │   ├── LandingPage.tsx      # Fintech product overview & interactive preview
│   │   ├── LoginPage.tsx        # Secure authentication with demo autofill
│   │   ├── RegisterPage.tsx     # Account registration with password confirmation
│   │   ├── DashboardPage.tsx    # 8 Authoritative KPIs, time filters, Recharts, recent feeds
│   │   ├── TransactionsPage.tsx # Paginated data table, risk/type filters, CSV export
│   │   ├── TransactionDetailPage.tsx # Numerical risk banner, SHAP waterfall, audit trail
│   │   ├── AnalyzePage.tsx      # Real-time multi-signal scoring (55/25/20 weights)
│   │   ├── AlertsPage.tsx       # Triage queue, status transitions, severity badges
│   │   ├── InvestigationsPage.tsx # Case management dossier, priority filtering
│   │   ├── InvestigationDetailPage.tsx # Forensics briefing, linked transactions, notes timeline
│   │   ├── BatchAnalysisPage.tsx # 5-step upload, pre-flight validation, enriched CSV export
│   │   ├── LiveMonitorPage.tsx  # WebSocket event bus, streaming filters, subtle threat notice
│   │   ├── AnalyticsPage.tsx    # Deep analytics, merchant category risk, volume trends
│   │   ├── ModelsPage.tsx       # ML registry, candidate comparison matrix, champion deployment
│   │   ├── DatasetsPage.tsx     # Dataset profiling, feature stats, correlation ranking
│   │   ├── MonitoringPage.tsx   # PSI drift telemetry, latency profiling (P95/P99), memory usage
│   │   ├── AdminPage.tsx        # RBAC user elevation, account toggles, paginated audit logs
│   │   ├── CopilotPage.tsx      # Grounded analyst assistant, evidence attribution
│   │   ├── ProfilePage.tsx      # Analyst credentials, active token claims, roles
│   │   └── SettingsPage.tsx     # Currency preference, theme toggles, alert thresholds
│   ├── types/
│   │   └── index.ts             # 100% backend-aligned TypeScript interfaces
│   ├── utils/
│   │   └── formatters.ts        # Locale-aware currency (INR grouping: ₹12,48,320), dates, percentages
│   ├── App.tsx                  # Role-guarded React Router route tree
│   ├── main.tsx                 # React entry point with providers
│   ├── index.css                # Enterprise design system CSS variables
│   └── vite-env.d.ts            # Vite client environment typings
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Environment Configuration

Create a `.env` file in `frontend/` (or copy from `.env.example`):

```bash
# REST API Gateway URL
VITE_API_URL=http://localhost:8000/api

# WebSocket Real-Time Telemetry Bus
VITE_WS_URL=ws://localhost:8000
```

---

## Setup & Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Compile & Typecheck Bundle:**
   ```bash
   npm run build
   ```

---

## Roles & Access Control Matrix

| Route | Minimum Role | Features |
|---|---|---|
| `/` | Public | Fintech overview, problem statement, interactive UI preview |
| `/login`, `/register` | Public | Authentication, credential validation, demo accounts |
| `/dashboard` | USER | 8 Backend KPIs, trends charts, recent transactions & alerts |
| `/analyze` | USER | Single payment simulation, multi-signal weights, SHAP waterfall |
| `/transactions` | USER | Explorer data table, search, risk filters, CSV export |
| `/transactions/:id` | USER | Numerical risk breakdown, SHAP waterfall, escalate to case |
| `/batch-analysis` | USER | 5-step upload, pre-flight CSV validation, enriched scoring |
| `/profile`, `/settings` | USER | Certified credentials, currency switcher (`INR`/`USD`/`EUR`/`GBP`), theme |
| `/alerts` | ANALYST | Queue triage, status transition (Under Review / Resolved / False Positive) |
| `/investigations` | ANALYST | Forensic dossier cases, risk exposure, audit notes |
| `/live-monitor` | ANALYST | Live WebSocket streaming telemetry, pause/resume, high-risk intercept |
| `/analytics` | ANALYST | Geographic risk distribution, category volume, cross-border analysis |
| `/copilot` | ANALYST | Grounded natural language assistant querying verified database records |
| `/admin`, `/models` | ADMIN | ML model benchmark matrix, promotion to live champion, retrain pipeline |
| `/admin/datasets` | ADMIN | Quality profiles, missing values check, target correlation rankings |
| `/admin/monitoring` | ADMIN | Population Stability Index (PSI) feature drift, latency P95/P99 |
| `/admin/users` | ADMIN | RBAC role elevation (`USER` / `ANALYST` / `ADMIN`), account deactivation |
| `/admin/audit-logs` | ADMIN | Regulatory immutable audit trail, paginated search |

---

## Default Evaluation Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@fraudguard.ai` | `Admin@123456` |
| **Analyst** | `analyst@fraudguard.ai` | `Analyst@123456` |
| **Viewer** | `user@fraudguard.ai` | `User@123456` |
