# ADR-003: Asynchronous Job Processing via BullMQ and Redis

## Status
Accepted

## Context
Retail store managers frequently upload multi-megabyte CSV files containing thousands of sales orders or distributor invoices. Ingestion requires CSV parsing, fuzzy string matching, database validation, inventory ledger adjustments, and recommendation recalculations. Processing this synchronously blocks the Node.js event loop and triggers HTTP gateway timeouts (504).

## Decision
We adopted **BullMQ** running on **Redis Cloud** as our distributed background task execution and job queue engine.

### Rationale
1. **Event Loop Non-Blocking:** HTTP ingestion endpoints return `202 Accepted` immediately upon receiving the file upload, offloading heavy processing to dedicated background workers.
2. **Crash Resilience & Retries:** BullMQ provides durable Redis-backed stream persistence. If a worker container restarts or crashes mid-import, the job is not lost and is re-attempted with exponential backoff.
3. **Progress Tracking:** BullMQ supports native job progress reporting (`job.updateProgress(percent)`), allowing the frontend to display a live progress bar to users.
4. **Lightweight Operational Footprint:** Unlike Apache Kafka or RabbitMQ which require complex cluster management, Redis Cloud is lightweight, low-latency, and already in use for application caching.

## Consequences
* **Positive:** Fast HTTP response times, zero dropped data ingestion jobs, live user progress bars.
* **Negative:** Requires Redis connection management with `maxRetriesPerRequest: null` and `noeviction` memory policies.
