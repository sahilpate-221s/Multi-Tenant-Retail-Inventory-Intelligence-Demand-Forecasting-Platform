# StockPilot — Production Deployment Guide

This document is the authoritative operational playbook for deploying, managing, and maintaining the StockPilot platform across all production cloud environments.

---

## 1. System Architecture & Topology

```
                      ┌──────────────────────────────┐
                      │        End User Browser      │
                      └──────────────┬───────────────┘
                                     │ HTTPS
                                     ▼
                      ┌──────────────────────────────┐
                      │        Vercel (Edge)         │
                      │  React 19 + Vite 8 Frontend  │
                      └──────────────┬───────────────┘
                                     │ HTTPS (REST API)
                                     ▼
                      ┌──────────────────────────────┐
                      │        Render (Oregon)       │
                      │  Express 5 + TS Backend API  │
                      └───────┬──────────────┬───────┘
                              │              │
             Postgres Protocol│              │ HTTP Internal
                              ▼              ▼
     ┌──────────────────────────┐  ┌──────────────────────────┐
     │     Supabase (Cloud)     │  │      Render (Oregon)     │
     │  PostgreSQL 16 (Drizzle) │  │  FastAPI ML Forecasting  │
     └──────────────────────────┘  └──────────────────────────┘
                              │
                    Redis URL │
                              ▼
     ┌──────────────────────────┐
     │    Redis Cloud (Queue)   │
     │   BullMQ Worker & Cache  │
     └──────────────────────────┘
```

### Infrastructure Summary
| Component | Provider | Region | Protocol / Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web** | Vercel | Global CDN | HTTPS (443) | `GET /` (HTTP 200) |
| **Backend API** | Render | Oregon (`us-west`) | HTTPS (443 / Node 4000) | `GET /ready` (HTTP 200) |
| **ML Engine** | Render | Oregon (`us-west`) | HTTPS (443 / Python 8000) | `GET /ready` (HTTP 200) |
| **Relational DB** | Supabase | Seoul (`ap-northeast-2`) | SSL `postgresql://` (5432) | Verified via `/ready` |
| **Async Cache & Queue**| Redis Cloud | Global | `redis://` (Port 12345) | Verified via `/ready` |

---

## 2. Environment Variables Specification

### 2.1 Backend API (Render)
Configure these in **Render Dashboard → StockPilot Backend → Environment**:

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Listening port for Express | `4000` |
| `DATABASE_URL` | Supabase connection string (pooler) | `postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:5432/postgres` |
| `REDIS_URL` | Redis Cloud connection URI | `redis://default:[pwd]@[host]:[port]` |
| `JWT_ACCESS_SECRET` | 256-bit cryptographically secure secret | Long random string (min 64 chars) |
| `JWT_REFRESH_SECRET` | 256-bit cryptographically secure secret | Distinct long random string |
| `FRONTEND_URL` | Deployed frontend domain (**no trailing slash**) | `https://multi-tenant-retail-inventory-intel.vercel.app` |
| `ML_SERVICE_URL` | URL of the deployed ML forecasting service | `https://[your-ml-service].onrender.com` |
| `GEMINI_API_KEY` | Google Gemini API key for AI assistant | `AIzaSy...` |
| `OPENAI_API_KEY` | OpenAI API key for alternative LLM models | `sk-proj-...` |

> [!CAUTION]
> **CORS Configuration:** Ensure `FRONTEND_URL` does **not** include a trailing `/`. If set to `https://site.vercel.app/`, browser preflight CORS checks will fail.

### 2.2 Frontend (Vercel)
Configure in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base endpoint of your backend API | `https://multi-tenant-retail-inventory.onrender.com` |

### 2.3 ML Service (Render)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Listening port for Uvicorn | `8000` |

---

## 3. Database Migration Strategy

Drizzle Kit is used to generate SQL migrations. When updating database schemas:

1. **Generate Migration Locally:**
   ```powershell
   cd apps/backend
   npm run db:generate
   ```
2. **Apply Migration to Production (Supabase):**
   ```powershell
   $env:DATABASE_URL="postgresql://postgres.[ref]:[pwd]@[host]:5432/postgres"
   npx drizzle-kit migrate
   ```
3. **Verify Migration:**
   ```powershell
   Invoke-RestMethod -Uri "https://multi-tenant-retail-inventory.onrender.com/ready"
   ```

---

## 4. Automated CI/CD & Deployments

StockPilot utilizes continuous integration via **GitHub Actions** (`.github/workflows/ci.yml`):
* **On Every Push to `main` or `master`:**
  1. Backend TypeScript build and unit/cross-tenant isolation test suite runs.
  2. Frontend build and component tests run.
  3. ML service Pytest test suite runs.
* **Automatic Cloud Triggers:**
  * Render automatically redeploys `apps/backend` and `apps/ml` upon new commits to `main`.
  * Vercel automatically redeploys `apps/frontend` upon new commits to `main`.

---

## 5. Post-Deployment Verification (Smoke Test)

After every production update or environment configuration change, execute the automated smoke test:

```powershell
# Run from repository root
powershell -File .\scripts\smoke-test.ps1
```

Expected output:
* Backend `/live` → `PASS`
* Backend `/ready` (DB + Redis) → `PASS`
* Backend `/health` → `PASS`
* Frontend Root (`/`) → `PASS (HTTP 200)`
* Frontend Deep Link (`/login`) → `PASS (HTTP 200)`
* Frontend Deep Link (`/register`) → `PASS (HTTP 200)`
