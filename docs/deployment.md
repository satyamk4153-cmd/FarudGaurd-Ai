# FraudGuard AI — Production Deployment & Operations Manual

## 1. Overview & Architecture

FraudGuard AI is designed for robust dual-mode execution:
1. **Local Development Mode:** Fast, zero-dependency environment utilizing SQLite and standalone FastAPI + Vite hot reloading.
2. **Production Containerized Cluster:** Multi-container production stack with **PostgreSQL 16**, **Redis 7**, **FastAPI Gateway**, **Celery Distributed Workers**, and **Nginx Reverse Proxy** serving optimized SPA static bundles with full WebSocket support.

---

## 2. Environment Variables Specification

The production environment is configured via `.env` (derived from `.env.example`). Secrets are **never** committed to version control.

```ini
# Environment Mode
ENVIRONMENT=production
DEBUG=false

# Persistence (PostgreSQL in production)
DATABASE_URL=postgresql://fraudguard_user:your_secure_password@postgres:5432/fraudguard
POSTGRES_DB=fraudguard
POSTGRES_USER=fraudguard_user
POSTGRES_PASSWORD=your_secure_password

# Message Broker & Cache (Redis)
REDIS_URL=redis://redis:6379/0

# Security & Tokens (Minimum 32-character high-entropy secret)
JWT_SECRET_KEY=your_production_secret_key_minimum_32_characters_long_entropy
JWT_EXPIRE_MINUTES=120

# CORS Allowed Origins (Comma-separated, no wildcards in production)
CORS_ORIGINS=https://fraudguard.yourdomain.com,http://localhost:80

# Google Gemini Copilot (Backend only, never exposed to client)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Model & Storage Paths
MODEL_DIRECTORY=/app/ml/models
UPLOAD_DIRECTORY=/app/uploads
MAX_UPLOAD_SIZE_MB=50

# Risk Engine Thresholds
DEFAULT_RISK_THRESHOLD=30.0
HIGH_RISK_THRESHOLD=75.0
CRITICAL_RISK_THRESHOLD=85.0
```

---

## 3. Production Deployment with Docker Compose

The root `docker-compose.yml` provisions all five core services with named volumes and automated health monitoring:

### 3.1 Step-by-Step Deployment
```bash
# 1. Clone repository
git clone https://github.com/your-org/fraudguard-ai.git
cd fraudguard-ai

# 2. Configure production secrets in .env
cp .env.example .env
nano .env

# 3. Build and launch all containers in detached mode
docker compose up --build -d

# 4. Verify all container health checks
docker compose ps
```

### 3.2 Automated Database Migrations
On startup, the backend automatically runs Alembic migrations. To manually execute or check migrations inside the container:
```bash
# Check migration history
docker compose exec backend python -m alembic current

# Upgrade to latest revision
docker compose exec backend python -m alembic upgrade head

# Roll back one revision if necessary
docker compose exec backend python -m alembic downgrade -1
```

---

## 4. Cloud Deployment (VPS / AWS / GCP / DigitalOcean)

### 4.1 Production Server Setup (Ubuntu 24.04 LTS)
1. Provision a VPS or Cloud VM (minimum 2 vCPU, 4GB RAM, 20GB SSD).
2. Install Docker and Docker Compose plugin:
   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```
3. Set up DNS records:
   - Point `A` record `fraudguard.yourdomain.com` to server public IP.
4. Issue Let's Encrypt SSL/TLS Certificate using Certbot or Cloudflare SSL.

### 4.2 Database Backup & Disaster Recovery

#### Automated PostgreSQL Backup
```bash
# Dump production database to compressed SQL backup
docker compose exec -t postgres pg_dump -U fraudguard_user -d fraudguard | gzip > /backups/fraudguard_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Restoring from Backup
```bash
# Decompress and restore database
gunzip -c /backups/fraudguard_backup_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T postgres psql -U fraudguard_user -d fraudguard
```

---

## 5. Seed Accounts & Credentials

The platform includes three operational role tiers:

| Role | Email | Password | Persona & Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@fraudguard.ai` | `Admin@123456` | Model governance, user role promotion, audit logs |
| **Fraud Analyst** | `analyst@fraudguard.ai` | `Analyst@123456` | Transaction forensics, alert triage, investigation cases |
| **Viewer / User** | `user@fraudguard.ai` | `User@123456` | Read-only analytics, real-time transaction scoring |

---

## 6. Health & Readiness Telemetry Endpoints

- **Liveness Check:** `GET /health` returns `{ "status": "HEALTHY" }`.
- **Deep Readiness Check:** `GET /ready` checks database connectivity, ML model loading in memory, Redis status, and Gemini configuration status without exposing sensitive credentials.
