# Changelog

All notable changes to the StockPilot platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-09-22 — Analytics & Security Hardening
### Added
- **Revenue & Demand Trajectory Trend Chart (`RevenueTrendChart.tsx`):** Interactive Recharts area visualization on Dashboard supporting Daily (30-day) and 12-Month Macro trends with dual-metric toggle (Gross Revenue vs. Units Sold).
- **PostgreSQL Connection Pool Tuning:** Configurable client-side pooling parameters in `apps/backend/src/db/client.ts` (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECT_TIMEOUT`) with pgBouncer / Supavisor transaction pooler compatibility (`prepare: false`).
- **Security & CSRF Formalization:** Comprehensive audit and architectural documentation in `docs/security/SECURITY_MODEL.md` detailing header-based Bearer token CSRF immunity and automated Pino log redaction.

---

## [1.0.0] — 2026-09-22 — Phase 24: Production Cloud Deployment
### Added
- Cloud infrastructure live on Vercel (frontend), Render (backend & ML), Supabase (PostgreSQL 16), and Redis Cloud.
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) running backend, frontend, and ML test suites with PostgreSQL and Redis service containers.
- Production smoke test runner scripts for Windows (`scripts/smoke-test.ps1`) and Linux/macOS (`scripts/smoke-test.sh`).
- Single-page application deep-link routing rewrite rules (`vercel.json`).
- Operational playbooks: `docs/operations/DEPLOYMENT.md`, `ROLLBACK.md`, and `MONITORING.md`.

---

## [0.23.0] — Phase 23: End-to-End & Load Testing
### Added
- End-to-end integration test (`tests/e2e/fullFlow.test.ts`) validating complete lifecycle: store creation, catalog setup, inventory deductions, restock generation, and dashboard aggregates.
- Autocannon HTTP load testing harness verifying high concurrency under sustained load.

---

## [0.22.0] — Phase 22: Observability & Production Health
### Added
- Standardized Kubernetes-ready health check probes: `/live`, `/ready`, and `/health`.
- Deep dependency validation verifying PostgreSQL connectivity and Redis responsiveness on every readiness probe.
- Structured contextual logging with correlation IDs.

---

## [0.21.0] — Phase 21: Database Indexing & Query Tuning
### Added
- Comprehensive composite B-Tree indexes across multi-tenant foreign keys (`store_id` + `sku`, `store_id` + `created_at`).
- ADR-004 documenting `EXPLAIN ANALYZE` benchmarks demonstrating 10x to 50x speedups on large sales aggregations.

---

## [0.20.0] — Phase 20: Security Hardening & Rate Limiting
### Added
- Multi-tenant data defense-in-depth with automated cross-tenant security regression test suite.
- Rate limiting middleware with sliding windows on authentication and AI chat endpoints.
- Helmet security headers (CSP, HSTS, X-Content-Type-Options) and CORS whitelist enforcement.

---

## [0.19.0] — Phase 19: What-If Inventory Simulator
### Added
- Interactive scenario simulator sandbox allowing store managers to model sales promotions, price changes, and supplier delivery delays.
- Projected cash flow, stockout date, and inventory turnover simulation modeling.

---

## [0.18.0] — Phase 18: Generative AI Inventory Assistant
### Added
- Google Gemini 2.5 Flash copilot integration with multi-round function calling.
- Strictly tenant-scoped tools: `get_product_details`, `get_stockout_risks`, `get_sales_trends`.
- Prompt injection defenses and markdown answer rendering.

---

## [0.17.0] — Phase 17: Time-Series Machine Learning Microservice
### Added
- Dedicated Python FastAPI microservice for statistical demand forecasting.
- Moving average and exponential smoothing models with confidence intervals (P10, P50, P90).
- Rolling-origin backtesting evaluation metrics (MAE, RMSE, WAPE).

---

## [0.16.0] — Phase 16: Anomaly Detection
### Added
- Z-score statistical anomaly detection identifying abnormal sales spikes and sudden demand drop-offs.
- Automated anomaly event generation with natural language explanation cards.

---

## [0.15.0] — Phase 15: Distributor Restock Bill Ingestion
### Added
- Bulk distributor invoice and restock bill ingestion.
- Bigram Dice coefficient fuzzy string matching engine to reconcile distributor invoice product names with store SKUs.

---

## [0.14.0] — Phase 14: Asynchronous Bulk CSV Ingestion
### Added
- High-throughput asynchronous CSV ingestion pipeline powered by BullMQ and Redis.
- Background worker chunking, parsing, and streaming thousands of sales records into PostgreSQL without blocking the main event loop.

---

## [0.13.0] — Phase 13: Returns & Refunds Processing
### Added
- Return-to-inventory and damaged write-off workflows.
- Automatic restocking ledger adjustments linked directly to historical sales invoice line items.

---

## [0.12.0] — Phase 12: In-Store POS Counter-Sale Terminal
### Added
- Point-of-Sale checkout terminal supporting hardware barcode scanner integration.
- Instant atomic stock deduction and printable thermal receipt generator.

---

## [0.11.0] — Phase 11: Sales Ledger & Invoicing
### Added
- Multi-item sales transaction processing with tax calculation and payment method breakdown.
- Aggregated sales metrics and real-time revenue summaries.

---

## [0.10.0] — Phase 10: Dead Stock Identification
### Added
- Stagnant capital detection engine analyzing slow-moving inventory over 30, 60, and 90-day inactivity horizons.
- Markdown recommendation generator and return-to-vendor suggestions.

---

## [0.9.0] — Phase 9: Stockout Risk Engine
### Added
- Proactive stockout warning system calculating runout dates based on velocity and supplier lead times.
- Visual risk severity classification (Critical, Warning, Low).

---

## [0.8.0] — Phase 8: Automated Reorder Recommendations
### Added
- Automated restock proposal generator taking supplier MOQ, pack sizes, and safety buffers into account.
- One-click recommendation conversion into structured Purchase Orders.

---

## [0.7.0] — Phase 7: Deterministic Inventory Mathematics
### Added
- Exact mathematical implementation of Safety Stock: $SS = Z \times \sigma_L \times \sqrt{L}$.
- Dynamic Reorder Point formula: $ROP = (d \times L) + SS$.
- Unit test suite verifying mathematical correctness against known benchmark distributions.

---

## [0.6.0] — Phase 6: Operational Analytics & Dashboard
### Added
- Real-time executive dashboard with revenue trends, stock turnover ratios, and top movers.
- Responsive Recharts data visualizations and category breakdown widgets.

---

## [0.5.0] — Phase 5: Supplier Registry & Purchase Orders
### Added
- Vendor management system tracking supplier contact details, lead times, and reliability notes.
- Purchase Order lifecycle management: Draft → Ordered → Partially Received → Received.

---

## [0.4.0] — Phase 4: Inventory Ledger & Auditing
### Added
- Central stock ledger tracking quantities on hand, safety stock levels, and reorder thresholds.
- Immutable audit trail capturing reasons for every stock adjustment.

---

## [0.3.0] — Phase 3: Product Catalog & Taxonomy
### Added
- Product SKU registry supporting barcodes, cost prices, selling prices, and active statuses.
- Category hierarchy management and paginated product list with search filters.

---

## [0.2.0] — Phase 2: Multi-Tenancy & Authentication
### Added
- Multi-tenant database isolation on `store_id`.
- Bcrypt password hashing and dual-token authentication (short-lived access JWT + HTTP-only refresh cookies).
- Role-based access control (Owner, Manager, Staff).

---

## [0.1.0] — Phase 1: Frontend Product Foundation
### Added
- React 19 + TypeScript + Vite application shell with Tailwind CSS.
- Responsive navigation sidebar, design tokens, and shared UI states (Loading, Error, Empty).
- Global React Error Boundary and TanStack Query setup.

---

## [0.0.1] — Phase 0: Engineering Foundation
### Added
- Monorepo structure with npm workspaces (`apps/frontend`, `apps/backend`, `apps/ml`).
- Express TypeScript backend and FastAPI Python ML service scaffolds.
- Docker Compose configuration for local PostgreSQL 16 and Redis 7.
- Vitest and Pytest test frameworks with ESLint and Prettier.