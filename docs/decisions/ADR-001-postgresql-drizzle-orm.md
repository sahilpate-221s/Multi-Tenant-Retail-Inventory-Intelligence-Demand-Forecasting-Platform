# ADR-001: Selection of PostgreSQL 16 and Drizzle ORM

## Status
Accepted

## Context
StockPilot requires a reliable, ACID-compliant relational data store capable of supporting multi-tenant B2B inventory transactions, complex ledger operations (inventory debits/credits), historical timeseries aggregations, and strict foreign-key referential integrity. We needed to choose between relational SQL (PostgreSQL, MySQL) and NoSQL (MongoDB), as well as select an ORM/query builder layer (Prisma, TypeORM, Drizzle ORM, Kysely).

## Decision
We selected **PostgreSQL 16** as the core relational database and **Drizzle ORM** as the TypeScript query builder and migration toolchain.

### Rationale
1. **ACID Transactions for Inventory Ledgers:** Stock adjustments, sales invoicing, and purchase order receipts require atomic transactional guarantees across multiple tables. MongoDB's document model introduces risks of partial updates or race conditions.
2. **Drizzle ORM Zero-Overhead:** Unlike Prisma which uses a separate Rust query engine binary and adds connection overhead, Drizzle compiles down to pure parameterized SQL strings using the native `postgres.js` driver.
3. **End-to-End TypeScript Invariance:** Drizzle schemas define database tables and simultaneously export inferrable TypeScript types (`typeof users.$inferSelect`), eliminating type drift between the database and application code.
4. **Transparent SQL Control:** Enables writing complex aggregations, window functions, and composite joins without the ORM fighting our query plans.

## Consequences
* **Positive:** Sub-10ms query execution, zero runtime binary dependencies, automated and inspectable SQL migrations (`drizzle-kit`).
* **Negative:** Requires disciplined manual indexing and schema structuring compared to schemaless document stores.
