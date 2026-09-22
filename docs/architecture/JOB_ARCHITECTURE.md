# StockPilot — Background Job & Queue Architecture

This document describes the asynchronous job processing pipeline in StockPilot powered by **BullMQ** and **Redis Cloud**.

---

## 1. Why Asynchronous Processing?

Certain retail operations are CPU or I/O intensive:
* Parsing and validating CSV files containing thousands of transactions.
* Calculating cross-catalog demand velocity and generating reorder recommendations across hundreds of SKUs.
* Performing batch database insertions and updating real-time stock balances.

If executed synchronously in the Express HTTP request handler, the Node.js event loop would block, causing HTTP timeouts (504 Gateway Timeout) and degrading responsiveness for other users. BullMQ moves these workloads into isolated background workers.

---

## 2. Queue Configuration & Connection Topology

```
                  ┌──────────────────────────────┐
                  │      Express API Server      │
                  │ (Producer: enqueues jobs)    │
                  └──────────────┬───────────────┘
                                 │ ioredis (push)
                                 ▼
                  ┌──────────────────────────────┐
                  │    Redis Cloud (Queue Host)  │
                  │   Stream-based BullMQ Queue  │
                  └──────────────┬───────────────┘
                                 │ ioredis (BRPOPLPUSH)
                                 ▼
                  ┌──────────────────────────────┐
                  │   BullMQ Background Worker   │
                  │ (Consumer: processes jobs)   │
                  └──────────────┬───────────────┘
                                 │ Batch Transactions
                                 ▼
                  ┌──────────────────────────────┐
                  │   Supabase PostgreSQL DB     │
                  └──────────────────────────────┘
```

### Redis Connection Configuration (`apps/backend/src/queue/redisConnection.ts`)
* **`maxRetriesPerRequest: null`**: Mandatory for BullMQ to allow blocking commands without connection dropped errors.
* **`enableReadyCheck: false`**: Required for compatibility with managed Redis Cloud environments.
* **Eviction Policy**: Set to `noeviction` in the Redis Cloud dashboard so queued jobs are never dropped under memory pressure.

---

## 3. Active Queues & Job Types

| Queue Name | Job Name | Payload | Processing Description |
| :--- | :--- | :--- | :--- |
| `import-queue` | `process-sales-import` | `{ importId, filePath, storeId }` | Streams historical sales CSV, resolves SKUs, inserts sales ledger records, updates stock levels in chunks of 500. |
| `import-queue` | `process-distributor-invoice` | `{ importId, filePath, storeId }` | Parses distributor restock bill, runs bigram Dice fuzzy matching to link invoice names to internal SKUs. |
| `analytics-queue`| `recalculate-recommendations`| `{ storeId }` | Calculates lead-time demand, updates stockout risk ratings, and updates `reorder_recommendations`. |

---

## 4. Concurrency & Failure Retries

* **Worker Concurrency:** Default 5 concurrent jobs per container instance.
* **Exponential Backoff:** Failed jobs automatically retry up to 3 times with exponential backoff:
  ```ts
  {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000 // 2s, 4s, 8s
    }
  }
  ```
* **Dead Letter Handling:** If all 3 attempts fail, the job moves to the `failed` state and updates the database record (`imports.status = 'FAILED'`) with the specific error message to display in the UI.
