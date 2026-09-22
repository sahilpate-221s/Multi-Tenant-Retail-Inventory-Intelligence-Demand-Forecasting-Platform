# Scaling Strategy — What Changes at Real Scale

This document is deliberately **not implemented** — it's the honest answer
to "what would break, and what would we do about it" as StockPilot grows
past its current MVP scale (~1 store, ~1,000 sales rows) toward the
targets named in the original spec (10,000 stores, 1M products, 100M sales).
Per spec section 40: design for ~100 stores now, document the path beyond
that, don't build speculative infrastructure before there's evidence it's needed.

## Current real bottlenecks (evidence-based, from Phase 21)
- `sales`/`sale_items` lacked indexes on their actual filter columns —
  fixed with real EXPLAIN ANALYZE evidence. At current table size (~1,000
  rows), the query planner still chooses sequential scans for `sales` in
  some cases — correctly, since that's genuinely cheaper at this size.
- Every analytics/forecasting/anomaly/dead-stock computation currently
  recalculates from scratch on each `generate` call — fine at our scale,
  would become the first real bottleneck at high sales volume per store.

## What breaks first, roughly in order of scale

### 100 → 1,000 stores
- Indexes added in Phase 21 start mattering for real — the query planner
  will naturally switch from Seq Scan to Index Scan as `sales` grows past
  the size where a full scan is genuinely cheaper (this requires no code
  change, only data volume — worth re-verifying with EXPLAIN ANALYZE at
  that point rather than assuming).
- Dashboard/analytics queries (Phase 6, 19) start taking meaningfully
  longer per request since they aggregate live on every call. The
  existing 60-second Redis cache (Phase 6) buys real time here, but a
  cache miss still means a full live aggregation.

### 1,000 → 10,000 stores (the spec's stated target)
- **Dashboard/analytics aggregation**: live aggregation on every
  cache-miss becomes genuinely slow. Next step: materialized views or a
  dedicated pre-aggregated summary table, refreshed on a schedule or on
  write, rather than computed live. This is a real architectural change,
  not a config tweak — would need its own phase-style plan.
- **BullMQ worker concurrency**: reviewed in Phase 21, left at default
  (1) since no evidence justified more. At this scale, multiple stores
  importing large CSVs simultaneously would genuinely start queuing
  behind each other — this is the concrete signal (documented in
  ADR-004's addendum) that would justify raising concurrency, paired
  with a review of per-store write contention.
- **Connection pooling**: tuned and parameterized in `apps/backend/src/db/client.ts`.
  Exposes configurable environment controls (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT`,
  `DB_CONNECT_TIMEOUT`, and `DB_PREPARE=false` for transaction-mode poolers
  like Supavisor/pgBouncer). Verified under sustained load using the Phase 23
  Autocannon load harness (`loadtest.js`) across concurrent API sessions.

### 10,000 stores → 100M sales records
- **Table partitioning**: `sales`, `sale_items`, and `inventory_movements`
  are the tables that grow unboundedly with usage (unlike `products` or
  `stores`, which grow with tenant count, not activity). Partitioning
  `sales`/`sale_items` by date range (e.g., monthly partitions) would let
  old data be queried/archived independently of recent data, and keep
  indexes on the "hot" recent partition small and fast.
- **Read replicas**: analytics/dashboard/AI-assistant queries are all
  read-heavy and read-only. At real scale, routing these to a read
  replica (rather than the primary write database) would isolate
  analytical load from transactional load (sales writes, inventory
  adjustments) — a classic, well-understood pattern, not something to
  build until write-vs-read contention is actually observed.
- **Background job scaling**: BullMQ supports running workers as
  separate, horizontally-scaled processes (rather than in-process with
  the API, as we do now, per the Phase 5 decision). At real job volume,
  this split becomes necessary — the worker and the API would deploy and
  scale independently.

## What we're explicitly NOT doing, and why
- **Microservices** — spec section 65 explicitly warns against this
  without a real organizational/scaling requirement. A modular monolith
  with clear internal boundaries (which this project has maintained
  throughout) can scale significantly further than commonly assumed
  before a genuine split is justified.
- **Kafka / message queues beyond BullMQ** — BullMQ+Redis handles our
  actual background-job needs; introducing a second, heavier messaging
  system now would be technology-for-resume-decoration (spec section 72),
  not a response to a real observed limitation.
- **Sharding the database** — a significant, hard-to-reverse
  architectural commitment. Read replicas and partitioning (above) solve
  the realistic scaling problems for a very long time before sharding
  would become genuinely necessary.

## How we'd actually know when to act
Per spec section 21's discipline throughout this project: **profile
before optimizing.** The concrete signals that would trigger each change
above are named specifically in each section — not "when it feels slow,"
but specific, measurable conditions (query plan changes, worker queue
depth, connection pool exhaustion, replication lag) worth instrumenting
via Phase 22's observability work before this document's changes are
ever implemented for real.