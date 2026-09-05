# StockPilot — Project Status

Last updated: Phase 1 completion

## Current Phase
**Phase 2 — Authentication & Multi-Tenancy: NOT STARTED (up next)**

## Completed Phases
- Phase 0 — Engineering Foundation
- Phase 1 — Product Foundation (Frontend Shell)

## In Progress
- None

## Upcoming Phase
- Phase 2 — Authentication & Multi-Tenancy (users, stores, refresh tokens schema; registration, login, logout, refresh; password hashing; JWT + HTTP-only refresh cookie; auth middleware deriving tenant context; RBAC; explicit cross-tenant security tests)

## What Exists Right Now
- Monorepo (npm workspaces): `apps/frontend`, `apps/backend`, `apps/ml`, `packages/*`
- Frontend: React + TS + Vite + Tailwind, React Router with all 19 planned routes (placeholders), app shell layout (sidebar + header), design tokens (status colors, Inter font), shared LoadingState/EmptyState/ErrorState components, typed API client + TanStack Query, global ErrorBoundary — all verified working
- Backend: Express + TS, `/health` endpoint only — no business endpoints yet
- ML: FastAPI, `/health` endpoint only
- Docker Compose: Postgres 16 + Redis 7, verified healthy, not yet used by application code
- Lint/format (ESLint + Prettier) across frontend/backend
- Tests: Vitest (frontend + backend), Pytest (ML) — all passing, business logic tests not yet applicable
- Docs: README, this file, CHANGELOG, .env.example

## Known Issues
- None currently open

## Technical Debt
- `/dashboard` route currently renders a temporary backend-connectivity-check page instead of the real dashboard. Intentional placeholder — real dashboard is built in Phase 6. Tracked here so it isn't forgotten.

## Deferred (By Design, Per Spec)
- SaaS billing/payments (post-MVP)
- Real email delivery (abstraction only, later)
- Advanced ML models (only if baselines underperform)
- Full RAG/vector search (only if a genuine use case emerges)
- Microservices/Kafka/Kubernetes (not justified at current scale)

## Architectural Decisions Made
- PostgreSQL + Drizzle ORM (not MongoDB)
- npm workspaces (not Turborepo/Nx)
- `apps/frontend`, `apps/backend`, `apps/ml` naming (developer preference)
- Vitest (frontend + backend), Pytest (ML)
- TanStack Query for server state management on the frontend
- API response shape standardized on `{success, data}` / `{success, error: {code, message, requestId}}` (spec section 29) — client-side handling built in Phase 1, real endpoints will conform starting Phase 2

## Blocked Work
- None