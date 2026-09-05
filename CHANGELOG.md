# Changelog

All notable changes to StockPilot are documented here.

## [Unreleased] — Phase 1: Product Foundation

### Added
- React Router with placeholder pages for all 19 planned routes
- App shell layout with sidebar navigation and header
- Design tokens: semantic status colors, Inter typeface
- Shared LoadingState, EmptyState, ErrorState components
- Typed API client wrapper matching standardized `{success, data}` response shape
- TanStack Query integration
- Global error boundary with verified crash recovery



## [Unreleased] — Phase 0: Engineering Foundation

### Added
- Monorepo structure with npm workspaces (`apps/frontend`, `apps/backend`, `apps/ml`, `packages/*`)
- Frontend scaffold: React + TypeScript + Vite + Tailwind CSS
- Backend scaffold: Express + TypeScript with `/health` endpoint
- ML service scaffold: FastAPI with `/health` endpoint
- Docker Compose for local PostgreSQL 16 and Redis 7
- ESLint + Prettier configuration for frontend and backend
- Vitest test setup for frontend and backend; Pytest setup for ML service
- Project documentation: README, PROJECT_STATUS, this changelog, `.env.example`