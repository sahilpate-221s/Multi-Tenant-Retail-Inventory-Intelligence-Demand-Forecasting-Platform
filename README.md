# StockPilot

**Inventory Decision Intelligence for Small Retail Businesses.**

StockPilot transforms sales, inventory, product, and supplier data into demand forecasts, stockout risk, reorder recommendations, dead-stock detection, anomaly detection, and what-if simulations — for small grocery and convenience retailers.

Traditional inventory software answers "What do I have?" StockPilot answers "What do I have, what will I probably need, when am I likely to run out, what should I order, and why?"

## Architecture

- **Frontend** (`apps/frontend`) — React + TypeScript + Vite + Tailwind CSS
- **Backend** (`apps/backend`) — Node.js + TypeScript + Express (modular monolith)
- **ML Service** (`apps/ml`) — Python + FastAPI (forecasting, statistical models)
- **Database** — PostgreSQL + Drizzle ORM
- **Cache / Jobs** — Redis + BullMQ

See `docs/architecture/` and `docs/decisions/` for detailed reasoning behind these choices.

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.10+
- Docker Desktop

### 1. Clone and install JS/TS dependencies
```powershell
git clone <repo-url>
Set-Location stockpilot
npm install
```

### 2. Set up environment variables
```powershell
Copy-Item .env.example apps/backend/.env
Copy-Item .env.example apps/ml/.env
```
Adjust values in each `.env` as needed (they currently share sensible dev defaults).

### 3. Start infrastructure (PostgreSQL + Redis)
```powershell
docker compose up -d
docker compose ps
```

### 4. Set up the ML service (Python virtual environment)
```powershell
Set-Location apps/ml
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 5. Run everything (separate terminals)
```powershell
# Terminal 1 — frontend
Set-Location apps/frontend
npm run dev

# Terminal 2 — backend
Set-Location apps/backend
npm run dev

# Terminal 3 — ML service (venv active)
Set-Location apps/ml
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- Frontend: http://localhost:5173
- Backend health check: http://localhost:4000/health
- ML service health check: http://localhost:8000/health
- ML interactive docs: http://localhost:8000/docs

## Development Commands

| Command | Description |
|---|---|
| `npm run lint:frontend` | Lint frontend |
| `npm run lint:backend` | Lint backend |
| `npm run format` | Format all TS/JS files with Prettier |
| `npm run test:frontend` | Run frontend tests (Vitest) |
| `npm run test:backend` | Run backend tests (Vitest) |
| `pytest` (in `apps/ml`, venv active) | Run ML service tests |

## Project Status

See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for current phase, completed work, and known issues.

## Testing

Each app has its own test suite (Vitest for frontend/backend, Pytest for ML). Run them individually via the commands above. Integration and E2E tests will be added under `tests/` starting in later phases.

## Deployment

Not yet configured. Target platforms (Phase 24): Vercel (frontend), Render (backend + ML), Supabase (PostgreSQL), Redis Cloud, Cloudinary.