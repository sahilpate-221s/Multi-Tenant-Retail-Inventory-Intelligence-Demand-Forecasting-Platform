# StockPilot — Multi-Tenant Retail Inventory Intelligence & Demand Forecasting Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Job%20Queue-orange)](https://bullmq.io/)
[![Vitest](https://img.shields.io/badge/Tests-105%20Passing-success?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**StockPilot** is an enterprise-grade, multi-tenant B2B SaaS platform engineered for retail inventory intelligence, demand forecasting, stockout risk prediction, and POS store operations.

Traditional inventory software only answers: *"What do I have?"*  
**StockPilot answers:** *"What do I have, what will I need over the next 7 to 30 days, when am I likely to stock out, what should I reorder today, and what capital is trapped in dead stock?"*

---

## 📑 Table of Contents

- [Key Architectural Highlights](#-key-architectural-highlights)
- [System Architecture & Monorepo](#-system-architecture--monorepo)
- [Core Feature Modules](#-core-feature-modules)
- [Deterministic Math & ML Engine](#-deterministic-math--ml-engine)
- [Security & Multi-Tenant Isolation](#-security--multi-tenant-isolation)
- [Database & Performance Optimization](#-database--performance-optimization)
- [Quick Start Guide](#-quick-start-guide)
- [Observability & Health Checks](#-observability--health-checks)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Technology Stack](#-technology-stack)
- [Project Documentation](#-project-documentation)

---

## 🌟 Key Architectural Highlights

- **Strict Multi-Tenancy:** Hard data isolation on `storeId` enforced at the database query layer with full automated cross-tenant security regression suites.
- **Pure Deterministic Inventory Math:** Safety stock ($Z \times \sigma \times \sqrt{L}$), lead-time demand, dynamic reorder points, and MOQ constraints calculated mathematically before touching statistical ML.
- **Dedicated Python ML Microservice:** Stateless FastAPI service providing time-series forecasting (Moving Average, Exponential Smoothing) with rolling-origin backtesting (MAE, RMSE, WAPE).
- **Asynchronous Data Ingestion:** Redis + BullMQ background job queues handle high-throughput multi-thousand-row CSV sales imports without blocking the event loop.
- **Grounded AI Assistant:** Google Gemini 2.5 Flash integrated with strict tenant-scoped tool calling — zero hallucination, purely querying verified database aggregates.
- **In-Store POS Counter Ledger:** Fast counter-sale terminal with barcode scanning, instant atomic inventory deduction, returns processing, and printable thermal receipts.
- **Warehouse Bulk Restock with Fuzzy Matching:** Upload distributor restock bills in CSV format with bigram Dice coefficient fuzzy matching for naming discrepancies.

---

## 🏛 System Architecture & Monorepo

The repository is structured as a clean TypeScript & Python monorepo using npm workspaces:

```
stockpilot/
├── apps/
│   ├── frontend/            # React 19 + TypeScript + Vite + Tailwind CSS
│   │   ├── src/
│   │   │   ├── components/  # Atomic design components, POS modals, charts, 3D Canvas
│   │   │   ├── hooks/       # Custom React query & mutation hooks
│   │   │   ├── layouts/     # Authenticated application shell & navigation
│   │   │   ├── pages/       # 24 dedicated views (Dashboard, POS, AI, Inventory, etc.)
│   │   │   └── lib/         # Typed API clients, state helpers, error mappers
│   ├── backend/             # Node.js + Express + TypeScript (Modular Monolith)
│   │   ├── src/
│   │   │   ├── db/          # PostgreSQL client & Drizzle ORM schemas (26 tables)
│   │   │   ├── queue/       # Redis connection & BullMQ worker definitions
│   │   │   ├── middleware/  # Rate limiters, JWT verification, Request-ID, Pino logging
│   │   │   └── modules/     # 21 independent domain feature modules
│   │   └── vitest.config.ts # Vitest configuration with automated env loading
│   └── ml/                  # Python 3.10+ FastAPI microservice
│       ├── app/
│       │   ├── forecasting/ # Exponential smoothing, moving averages, backtesting
│       │   └── main.py      # FastAPI application, CORS, /live & /ready probes
│       └── requirements.txt
├── docs/                    # Architectural decisions (ADRs) & audit reports
├── tests/
│   └── e2e/                 # Full end-to-end integration lifecycle test
├── docker-compose.yml       # Production-mirrored PostgreSQL 16 & Redis 7
└── README.md
```

---

## 🚀 Core Feature Modules

### 1. In-Store POS Sales Counter & Returns
- Real-time sales register (`/sales`) allowing fast counter checkout with keyboard hotkeys and live product searching.
- Atomic stock decrement with transactional database commits.
- Full line-item tracking, discount calculations, tax handling, and customer change computations.
- Instant thermal receipt rendering and customer return processing with automatic stock reversal.

### 2. Reorder Recommendations & Purchase Orders
- Automatically generates ranked reorder advisories prioritized by urgency (days until stockout).
- Explicit reason codes explaining **why** each recommendation was generated (e.g., `BELOW_REORDER_POINT`, `LEAD_TIME_BREACH`).
- One-click transformation of recommendations into formal Purchase Orders (`/purchase-orders`) with supplier tracking.

### 3. Dead Stock Scoring & Capital Release
- Mathematical scoring engine (0–100) evaluating days without sale against demand velocity.
- Computes exact monetary capital trapped in stagnant merchandise.
- Protects new products via age guards to avoid falsely flagging recently registered SKUs.

### 4. Stockout Risk Classification
- Continuously projects run-out dates by evaluating current stock, incoming purchase orders, and daily demand velocity.
- Categorizes risk severity based on supplier lead times: `critical`, `high`, `moderate`, `low`, and `unknown`.

### 5. Multi-Source Anomaly Detection
- Z-score statistical engine detecting abnormal demand spikes, unusual inventory drops, and return clusters.
- Generates hypothesis-driven root cause diagnostic labels (e.g., quality defects, data-entry errors, marketing surges).

### 6. What-If Scenario Simulator
- Interactive sandbox enabling retailers to simulate hypothetical conditions (e.g., `+25% demand surge`, `+7 days supplier delay`, `$5,000 budget cap`).
- Computes revised safety stocks and potential stockout dates without mutating any live production records.

### 7. Grounded AI Intelligence Assistant
- Powered by Gemini 2.5 Flash with structured function-calling tools:
  - `getInventoryIntelligence`: Live velocity, safety stock, and reorder status.
  - `getSalesSummary`: Revenue, margins, and top movers across custom date horizons.
  - `getDeadStockAlerts`: Capital tied up in slow-moving items.
  - `getStockoutRisks`: High-priority stockout warnings.
  - `getForecast`: Machine learning forecasts with model confidence ratings.
- System prompt enforces strict grounded factual responses — hallucination is barred by design.

### 8. High-Throughput CSV Ingestion & Bulk Restock
- Asynchronous BullMQ background worker ingest multi-thousand-row CSV transaction files.
- Two-phase validation: fast preview with format validation, followed by chunked background execution.
- Warehouse Restock Upload tool with bigram Dice coefficient fuzzy matching to reconcile distributor invoice titles against catalog product names.

---

## 🧮 Deterministic Math & ML Engine

StockPilot enforces a clear separation between statistical mathematics and predictive models:

### Pure Inventory Formulas (Phase 7 Engine)
$$\text{Average Daily Demand} = \frac{\sum_{i=1}^{N} \text{Daily Sales}}{N}$$

$$\text{Safety Stock} = Z \times \sigma_d \times \sqrt{L}$$
*(where $Z = 1.65$ for 95% service level, $\sigma_d$ is demand standard deviation, and $L$ is supplier lead time in days)*

$$\text{Reorder Point (ROP)} = (\text{Average Daily Demand} \times L) + \text{Safety Stock}$$

$$\text{Reorder Quantity} = \max\left(\text{MOQ}, (\text{ROP} - \text{Current Stock} - \text{Incoming Stock}) + \text{Safety Stock}\right)$$

### Predictive ML Models (FastAPI Microservice)
- **Simple Moving Average (SMA):** Baseline for stable, low-variance SKUs.
- **Weighted Moving Average (WMA):** Prioritizes recent demand shifts.
- **Single & Double Exponential Smoothing:** Captures trend adjustments across custom horizons (7-day and 30-day).
- **Rolling-Origin Cross-Validation:** Backtests models against historical splits to select the lowest Mean Absolute Error (MAE) and Weighted Absolute Percentage Error (WAPE).

---

## 🔒 Security & Multi-Tenant Isolation

- **Tenant Scoping:** Every business entity (`products`, `sales`, `suppliers`, `inventory`, `purchase_orders`, `recommendations`, `anomalies`, `simulations`, `notifications`) contains a mandatory foreign key to `stores.id`.
- **JWT Authentication:** Short-lived access tokens (15m) paired with HTTP-only, `SameSite=lax` refresh cookies stored in secure sessions.
- **Automated Cross-Tenant Penetration Tests:** 8 dedicated Vitest test suites verify that Store B cannot view, edit, or delete any entities belonging to Store A across all domains.
- **Defensive Middleware:**
  - `express-rate-limit`: Tiered limits on authentication (10 req/15min), AI queries (15 req/min), and general API (120 req/min).
  - `helmet`: Strict Content Security Policy (CSP) and cross-origin isolation.
  - `pino`: Sensitive field redaction (`password`, `token`, `authorization`, `apiKey`) in structured request logs.
  - `X-Request-Id`: Nanoid-generated tracking headers propagated across all services.

---

## ⚡ Database & Performance Optimization

Optimized using real PostgreSQL `EXPLAIN ANALYZE` execution profiles (documented in [ADR-004](docs/decisions/ADR-004-performance-indexing.md)):

```sql
-- Composite index for fast tenant date-range analytics aggregations
CREATE INDEX sales_store_id_sale_date_idx ON sales (store_id, sale_date);

-- Foreign key indexes eliminating sequential scans during high-volume joins
CREATE INDEX sale_items_product_id_idx ON sale_items (product_id);
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
```

- **Query Latency Improvement:** Full table sequential scans dropped from $O(N)$ execution down to $O(\log N)$ index bitmap scans, yielding an **87% reduction in query execution time** on multi-thousand-row datasets.
- **Transactional Integrity:** All stock modifications write simultaneously to `inventory` and an immutable, append-only `inventory_movements` audit ledger within atomic database transactions.

---

## 🛠 Quick Start Guide

### Prerequisites
- **Node.js**: v20.x or higher
- **Python**: v3.10 or higher
- **Docker Desktop**: Running locally
- **Git**

---

### Step 1: Clone Repository & Install Node Dependencies
```powershell
git clone https://github.com/sahilpate-221s/Multi-Tenant-Retail-Inventory-Intelligence-Demand-Forecasting-Platform.git stockpilot
cd stockpilot
npm install
```

---

### Step 2: Start Infrastructure (PostgreSQL & Redis)
```powershell
docker compose up -d
docker compose ps
```
*PostgreSQL runs on port `5432` and Redis runs on port `6379`.*

---

### Step 3: Configure Environment Variables
Create your environment configuration files:

**`apps/backend/.env`:**
```ini
PORT=4000
DATABASE_URL=postgresql://stockpilot:stockpilot_dev_password@localhost:5432/stockpilot
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:5173
```

**`apps/ml/.env`:**
```ini
PORT=8000
DEBUG=True
```

---

### Step 4: Run Database Migrations
Push database schemas and initialize indexes using Drizzle ORM:
```powershell
cd apps/backend
npm run db:push
# or npm run db:migrate
cd ../..
```

---

### Step 5: Setup Python Virtual Environment (ML Service)
```powershell
cd apps/ml
python -m venv venv

# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cd ../..
```

---

### Step 6: Start All Applications

Open three terminal windows:

**Terminal 1 — Backend API Server (`http://localhost:4000`):**
```powershell
cd apps/backend
npm run dev
```

**Terminal 2 — Python ML Microservice (`http://localhost:8000`):**
```powershell
cd apps/ml
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 — React Frontend Client (`http://localhost:5173`):**
```powershell
cd apps/frontend
npm run dev
```

---

## 🩺 Observability & Health Checks

StockPilot features genuine, dependency-aware observability endpoints:

| Service | Method & Endpoint | Description |
| :--- | :--- | :--- |
| **Backend** | `GET /live` | Instant process liveness probe (`status: "alive"`). |
| **Backend** | `GET /ready` | Verifies real DB connection (`SELECT 1`) & Redis ping (`status: "ready"` or `503`). |
| **Backend** | `GET /health` | Comprehensive dashboard probe with dependency breakdown & timestamp. |
| **Backend** | `GET /api/observability/queues` | Live BullMQ job metrics (waiting, active, completed, failed, delayed). |
| **Backend** | `GET /api/observability/metrics` | Platform totals across stores, products, and processed sales records. |
| **ML Service**| `GET /live` | ML process responsiveness probe. |
| **ML Service**| `GET /ready` | Confirms stateless model worker readiness. |

---

## 🧪 Testing & Quality Assurance

The platform contains over **105+ automated tests** verifying unit math, security boundaries, and full end-to-end workflows:

```powershell
# Run backend test suite (unit + cross-tenant isolation)
cd apps/backend
npm run test

# Run full end-to-end user lifecycle test
cd ../..
npx vitest run tests/e2e/fullFlow.test.ts --config apps/backend/vitest.config.ts

# Run Python ML service tests
cd apps/ml
pytest
```

### Verified Test Suites:
- `health.test.ts` — API liveness & readiness verification
- `password.test.ts` — Bcrypt hashing & verification
- `safetyStock.test.ts` & `reorderPoint.test.ts` — Deterministic inventory formulas
- `reorderQuantity.test.ts` & `stockoutEstimate.test.ts` — Lead time & MOQ constraints
- `deadStockScoring.test.ts` — Stagnant capital ranking
- `anomalyDetection.test.ts` & `hypothesisGenerator.test.ts` — Z-score diagnostics
- **Cross-Tenant Isolation Regression Suites:**
  - `categories.crossTenant.test.ts`
  - `suppliers.crossTenant.test.ts`
  - `inventory.crossTenant.test.ts`
  - `products.crossTenant.test.ts`
  - `purchaseOrders.crossTenant.test.ts`
  - `recommendations.crossTenant.test.ts`
  - `deadStock.crossTenant.test.ts`
  - `forecasting.crossTenant.test.ts`
  - `stockout.crossTenant.test.ts`
  - `anomalies.crossTenant.test.ts`
  - `returns.crossTenant.test.ts`
  - `simulator.crossTenant.test.ts`
  - `notifications.crossTenant.test.ts`
- **E2E Integration Test:** `fullFlow.test.ts` (Register → Product → Supplier → Stock Adjust → Recommendations → Dashboard).

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Three.js / React Three Fiber |
| **Backend** | Node.js 20+, Express 5, TypeScript, Drizzle ORM, Zod, Pino Logger, Nanoid |
| **ML Microservice** | Python 3.10+, FastAPI, NumPy, Pandas, Scikit-learn, Statsmodels, Uvicorn |
| **Datastores & Queues** | PostgreSQL 16, Redis 7, BullMQ |
| **Generative AI** | Google Gemini 2.5 Flash SDK (Multi-round function calling) |
| **Testing** | Vitest, Supertest, Pytest |
| **DevOps & Tooling** | Docker Compose, ESLint, Prettier, Dotenv |

---

## 📚 Project Documentation

- [Comprehensive Architectural Audit](PROJECT_COMPREHENSIVE_AUDIT.md) — 200-line deep dive into architectural scores, metrics, and security.
- [Step-by-Step Testing Guide](STEP_BY_STEP_TESTING_GUIDE.md) — Manual testing instructions covering every user journey.
- [ADR-004: Performance Indexing Decision](docs/decisions/ADR-004-performance-indexing.md) — PostgreSQL `EXPLAIN ANALYZE` benchmarking and rationale.
- [Architecture Overview](docs/architecture/ARCHITECTURE.md) — Detailed diagrams and system component interactions.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.