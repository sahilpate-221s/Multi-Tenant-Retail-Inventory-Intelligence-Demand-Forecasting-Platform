# StockPilot — Data Flow Architecture

This document maps out the end-to-end data lifecycle across critical user journeys: Authentication, POS Counter-Sale Checkout, Async Sales Ingestion, and ML Demand Forecasting.

---

## 1. Authentication & Session Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Store Owner / Staff
    participant Browser as Frontend App
    participant API as Express Auth Module
    participant DB as Supabase PostgreSQL

    User->>Browser: Enter Email & Password
    Browser->>API: POST /api/auth/login { email, password }
    API->>DB: SELECT * FROM users WHERE email = $1
    DB-->>API: User record (with bcrypt hash)
    API->>API: bcrypt.compare(password, hash)
    API->>API: Generate Access Token (15m JWT)<br/>Generate Refresh Token (30d crypto random)
    API->>DB: INSERT INTO refresh_tokens (hash, expires_at)
    API-->>Browser: HTTP 200 { accessToken }<br/>Set-Cookie: refreshToken (HttpOnly, Secure)
    Browser->>Browser: Store accessToken in memory
```

---

## 2. In-Store POS Counter-Sale Checkout Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier / Manager
    participant POS as POS Terminal View
    participant API as Express Sales Module
    participant DB as Supabase PostgreSQL

    Cashier->>POS: Scan Barcode / Add Items
    POS->>POS: Calculate Line Subtotals, Taxes & Discount
    Cashier->>POS: Complete Payment (Cash/Card/UPI)
    POS->>API: POST /api/sales { items: [{ productId, qty, price }], paymentMethod }
    Note over API: Transaction Begins
    API->>DB: Verify active stock for all items
    API->>DB: INSERT INTO sales (header)
    API->>DB: INSERT INTO sale_items (line items)
    API->>DB: UPDATE inventory SET quantity_on_hand = quantity_on_hand - $qty
    API->>DB: INSERT INTO inventory_audit_log (reason: "SALE")
    Note over API: Transaction Commits
    API-->>POS: HTTP 201 { saleId, invoiceNumber, receiptData }
    POS->>Cashier: Print Thermal Receipt / Open Drawer
```

---

## 3. High-Throughput Async CSV Sales Import Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Store Manager
    participant UI as Bulk Import View
    participant API as Express Imports Module
    participant Redis as Redis Cloud (BullMQ)
    participant Worker as Background Ingestion Worker
    participant DB as Supabase PostgreSQL

    Admin->>UI: Upload multi-thousand row CSV
    UI->>API: POST /api/imports/sales (multipart/form-data)
    API->>DB: INSERT INTO imports (status: "QUEUED")
    API->>Redis: Enqueue Job: `process-sales-import` { importId, filePath }
    API-->>UI: HTTP 202 Accepted { importId, status: "QUEUED" }
    UI->>UI: Start polling /api/imports/:id/status
    
    Worker->>Redis: Pick up `process-sales-import` job
    Worker->>Worker: Stream CSV line by line via csv-parse
    Worker->>DB: Validate SKUs in bulk batch
    Worker->>DB: Bulk INSERT sales & sale_items (chunks of 500)
    Worker->>DB: Deduct inventory stock ledger
    Worker->>DB: UPDATE imports SET status = "COMPLETED", rows_processed = $N
    Worker->>Redis: Acknowledge job completion
    UI->>API: Poll status
    API-->>UI: HTTP 200 { status: "COMPLETED", rows: 2846 }
```

---

## 4. ML Demand Forecasting & Reorder Generation

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as System Cron / User Trigger
    participant API as Express Forecast Module
    participant DB as Supabase PostgreSQL
    participant ML as FastAPI ML Microservice

    Scheduler->>API: Trigger Daily Forecast Run
    API->>DB: Query 90-day daily aggregated sales per product
    DB-->>API: Daily sales timeseries array
    API->>ML: POST /forecast/predict { timeseries, horizon: 14 }
    ML->>ML: Fit Exponential Smoothing / Moving Average
    ML->>ML: Generate P10, P50, P90 predictions
    ML-->>API: HTTP 200 { predictions: [{ date, qty, lower, upper }] }
    API->>DB: INSERT INTO sales_forecasts
    API->>API: Calculate Safety Stock & ROP against Lead Time
    alt Stock On Hand <= ROP
        API->>DB: INSERT INTO reorder_recommendations (urgency: "HIGH", qty: ROQ)
    end
```
