# StockPilot — Machine Learning Forecasting Service

This document describes the design, models, and API interface of the StockPilot Python ML microservice.

---

## 1. Overview & Architecture

The ML service is a dedicated microservice built on **FastAPI** (`apps/ml`) responsible for time-series demand forecasting and sales anomaly detection.

* **Framework:** FastAPI with Pydantic typing and Uvicorn ASGI server.
* **Separation of Concerns:** The Node.js backend handles web traffic and transaction coordination, while Python handles statistical modeling, vectorized mathematical computations, and inference.

---

## 2. Demand Forecasting Models

### 2.1 Baseline Models
* **Moving Average (7 & 30-day):** Computes rolling windows with exponential smoothing weights for high-turnover SKUs.
* **Linear Trend with Day-of-Week Seasonality:** Decomposes historical daily sales into baseline trend + cyclical weekday multipliers.

### 2.2 Advanced Time-Series Modeling
* Handles intermittent demand (Croston's method) for slow-moving products where sales occur erratically.
* Generates confidence bounds (P10, P50, P90) to inform dynamic safety stock calculations.

---

## 3. Endpoints & API Contract

* **`GET /live`**: Returns `{"status": "alive"}`.
* **`GET /ready`**: Returns `{"status": "ready"}`.
* **`POST /forecast/predict`**:
  * **Input:** Array of historical daily sales `[ { "date": "2026-09-01", "quantity": 12 }, ... ]` and forecast horizon (e.g. 14 days).
  * **Output:** Predicted daily sales array with lower and upper confidence bounds.
