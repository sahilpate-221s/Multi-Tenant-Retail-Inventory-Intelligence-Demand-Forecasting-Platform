# Contributing to StockPilot

Thank you for your interest in contributing to StockPilot! This guide outlines everything you need to set up your environment, follow our coding standards, and submit contributions.

---

## 1. Monorepo Architecture

StockPilot is organized as an npm workspaces monorepo:
* **`apps/frontend`**: React 19 + TypeScript + Vite + Tailwind CSS
* **`apps/backend`**: Node.js 20+ / 22 + Express 5 + TypeScript + Drizzle ORM
* **`apps/ml`**: Python 3.10+ + FastAPI + Scikit-learn + Statsmodels
* **`packages/*`**: Shared libraries and utilities

---

## 2. Local Development Setup

### Prerequisites
* **Node.js**: v20+ or v22+ (LTS)
* **npm**: v10+
* **Python**: v3.10+ (with `venv` and `pip`)
* **Docker Desktop**: For running local PostgreSQL and Redis

### Step-by-Step Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/sahilpate-221s/Multi-Tenant-Retail-Inventory-Intelligence-Demand-Forecasting-Platform.git
   cd Multi-Tenant-Retail-Inventory-Intelligence-Demand-Forecasting-Platform
   ```
2. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```
3. **Start local infrastructure (PostgreSQL & Redis):**
   ```bash
   docker compose up -d
   ```
4. **Configure environment files:**
   * Copy `apps/backend/.env.example` to `apps/backend/.env`.
   * Copy `.env.example` to root `.env`.
5. **Run database migrations:**
   ```bash
   cd apps/backend
   npm run db:migrate
   ```
6. **Set up Python ML environment:**
   ```bash
   cd apps/ml
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   ```
7. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd apps/backend && npm run dev

   # Terminal 2: Frontend
   cd apps/frontend && npm run dev

   # Terminal 3: ML Service
   cd apps/ml && uvicorn app.main:app --reload --port 8000
   ```

---

## 3. Coding Conventions & Standards

### TypeScript & JavaScript
* All backend database queries **must** be tenant-scoped using `eq(table.storeId, auth.storeId)`.
* Every API endpoint request body must be strictly validated with a **Zod** schema.
* Use `camelCase` for variables and functions, `PascalCase` for React components and TypeScript types.
* Avoid `any` types wherever possible.

### Python
* Adhere to PEP 8 style conventions.
* Use type annotations on all FastAPI route handlers and internal methods.

---

## 4. Running Tests

Always ensure all automated tests pass before submitting a pull request:

```bash
# Backend unit and cross-tenant isolation tests (107 tests)
npm run test --workspace=apps/backend

# Frontend component and routing tests
npm run test --workspace=apps/frontend

# Python ML service tests
cd apps/ml && python -m pytest tests/ -v

# Production smoke test
powershell -File .\scripts\smoke-test.ps1
```

---

## 5. Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and write automated tests verifying the behavior.
3. Verify formatting and linting:
   ```bash
   npm run format
   npm run lint:backend
   npm run lint:frontend
   ```
4. Commit with conventional commit messages:
   * `feat: add new supplier export feature`
   * `fix: correct stockout risk threshold calculation`
   * `docs: update API documentation`
5. Push to your fork and submit a PR to `main`.
6. Verify all GitHub Actions CI checks pass green.
