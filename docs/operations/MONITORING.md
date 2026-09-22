# StockPilot — Production Monitoring & Observability Guide

This document outlines the observability stack, health check endpoints, logging practices, and performance monitoring strategies for the StockPilot platform.

---

## 1. Health Check Contracts

StockPilot implements standard cloud-native liveness and readiness probe semantics:

| Endpoint | Probe Type | Purpose | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET /live` | Liveness | Verifies Express server process is responsive | `200 OK` `{"status":"alive"}` |
| `GET /ready` | Readiness | Verifies dependencies (Supabase DB + Redis Cloud) | `200 OK` `{"status":"ready","checks":{"database":true,"redis":true}}` |
| `GET /health`| Health / Status | Deep system diagnostic + service metadata | `200 OK` `{"status":"ok","service":"stockpilot-backend","database":"ok"}` |

### Failure Codes:
* `503 Service Unavailable`: If PostgreSQL or Redis fails to respond within 5000ms. Render detects consecutive 503s and marks the container unhealthy.

---

## 2. Viewing Live Logs

### 2.1 Backend API & ML Service (Render)
* Open **Render Dashboard → Services → [service-name] → Logs**.
* Supports real-time log streaming (`live tail`) and regex filtering.
* Key log prefixes to monitor:
  * `[AUTH]` — Authentication and token lifecycle events.
  * `[QUEUE]` — BullMQ background job intake, processing, and completion.
  * `[FORECAST]` — ML model invocation and inference latency.
  * `[ERROR]` — Unhandled exceptions with stack traces.

### 2.2 Frontend (Vercel)
* Open **Vercel Dashboard → [Project] → Logs**.
* Monitors edge function routing, HTTP status distributions, cache HIT/MISS rates, and Core Web Vitals (LCP, FID, CLS).

---

## 3. Database Performance & Pooler Monitoring (Supabase)

* Open **Supabase Dashboard → Database → Health / Query Performance**.
* Key metrics to track:
  * **Active Connections:** Kept low and optimized via pgBouncer connection pooler on port `5432` / `6543`.
  * **Cache Hit Ratio:** Target > 99%.
  * **Slow Queries:** Queries exceeding 200ms trigger performance review.
