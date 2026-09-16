# ADR-004: Sales/Sale Items Indexing (Phase 21 Performance Review)

## Context
Phase 21 required profiling real queries with `EXPLAIN ANALYZE` rather than
guessing at optimizations, per spec section 21's explicit guidance.

## Investigation
Ran `EXPLAIN ANALYZE` on the two heaviest real query patterns in the app —
dashboard/analytics aggregation (filters `sales` by `store_id` + `sale_date`)
and per-product demand queries (filters `sale_items` by `product_id`).

**Before any changes:**
- `sales` had only its primary key indexed — no index on `store_id` or
  `sale_date`, despite every analytics/forecasting/anomaly/stockout query
  since Phase 6 filtering on exactly this combination.
- `sale_items` had no index on `product_id` or `sale_id` — Postgres does
  NOT auto-index foreign keys (only primary keys and unique constraints).
- Both queries showed `Seq Scan` (full table scan) on `sales` and
  `sale_items`. Execution time was fast (3-5ms) purely because tables
  were small (~700-1000 rows) at the time of testing.

## Decision
Added three indexes, each justified by real, observed query patterns:
- `sales_store_id_sale_date_idx` — composite btree on `(store_id, sale_date)`
- `sale_items_product_id_idx` — btree on `product_id`
- `sale_items_sale_id_idx` — btree on `sale_id`

## Result (re-verified with EXPLAIN ANALYZE after the change)
- `sale_items` queries now correctly use `Bitmap Index Scan on
  sale_items_product_id_idx` — confirmed working as intended.
- `sales` queries **still show `Seq Scan`**, even though the new index
  genuinely exists. This is the Postgres query planner making a correct,
  deliberate cost-based decision: at ~724 rows, scanning the whole table
  is cheaper than the overhead of an index lookup. This is NOT a failure
  of the index — it's expected, correct planner behavior at small scale.

## What this means going forward
Per spec section 40's scaling guidance: this index will very likely
switch to being used automatically once `sales` grows into the tens or
hundreds of thousands of rows — no code change would be needed, only
data volume needs to cross the point where the planner's cost estimate
favors the index. This is the honest, evidence-based answer to "did the
optimization work" at our current scale — worth re-checking with
`EXPLAIN ANALYZE` again once real production data volume exists (Phase 24+),
rather than assuming success or failure without re-measuring.

## Alternatives considered
- Adding more indexes speculatively (e.g., on every foreign key across
  every table) — rejected as premature per spec section 71's "does the
  complexity add real value" test; we only indexed columns with actual
  observed `Seq Scan` evidence against real, repeated query patterns.




---

# Addendum: BullMQ Worker Concurrency (Phase 21)

## Investigation
Checked the CSV import worker's configuration: `new Worker<CsvImportJobData>(...)`
has no `concurrency` option set, meaning it runs at BullMQ's default of `1` —
strictly sequential job processing, one import at a time per store.

## Decision
**Leave it at the default for now.** No evidence exists of import queuing
ever becoming a real bottleneck — no store has had two large imports
genuinely waiting on each other. Changing this now would be speculative
tuning without justification, the same anti-pattern the indexing work
above was careful to avoid.

## What would justify revisiting this
A future signal worth watching for: if `imports.status = 'processing'`
regularly persists for an unusually long time, or multiple `pending`
import records queue up waiting on the same worker, that's real evidence
concurrency should be raised — and it would need to be paired with a
careful review of whether concurrent imports for the same store could
race on inventory or sales writes, not just bumped blindly.