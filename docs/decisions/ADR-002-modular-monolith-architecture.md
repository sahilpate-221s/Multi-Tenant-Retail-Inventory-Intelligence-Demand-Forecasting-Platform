# ADR-002: Modular Monolith vs Microservices Architecture

## Status
Accepted

## Context
When designing StockPilot's backend architecture, we evaluated whether to construct a distributed microservices network (separate services for auth, catalog, orders, inventory, notifications) or adopt a **Modular Monolith** pattern.

## Decision
We chose a **Modular Monolith** for the core Express/TypeScript application, with a single separate stateless microservice dedicated to Python machine learning.

### Rationale
1. **Elimination of Distributed System Failure Modes:** Microservices introduce network latency, circuit breakers, distributed transaction failures (two-phase commit or complex saga orchestrators), and high operational cognitive load.
2. **Strict Module Boundaries:** Logic is strictly organized into vertical domain slices under `apps/backend/src/modules/*` (`auth/`, `products/`, `inventory/`, `sales/`, `forecasting/`). Each module owns its controllers, services, schemas, and routes.
3. **Atomic Database Transactions:** Cross-domain operations (e.g. creating a sale and deducting inventory stock) execute within a single atomic PostgreSQL transaction without distributed commit coordination.
4. **Future Extractability:** Because modules have zero cyclic dependencies and communicate via defined service contracts, any module can be broken out into an independent microservice in the future if specific scaling bottlenecks emerge.

## Consequences
* **Positive:** Simplified deployments on Render, fast local development, instant in-memory function calls, and atomic database commits.
* **Negative:** All Node.js modules share the same container runtime and memory space.
