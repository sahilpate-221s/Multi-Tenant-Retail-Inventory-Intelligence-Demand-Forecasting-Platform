# StockPilot — Machine Learning Architecture

This document describes the statistical and time-series demand forecasting architecture of the StockPilot Python microservice (`apps/ml`).

---

## 1. Design & Microservice Isolation

The ML service is decoupled from the main Node.js API to allow:
1. **Vectorized NumPy / Pandas Operations:** High-performance mathematical matrix manipulations.
2. **Stateless Scalability:** Can be horizontally scaled or deployed on GPU/CPU specialized containers independently of the main API.
3. **Clean Separation of Concerns:** Node.js coordinates user sessions and database transactions; Python executes statistical inference.

---

## 2. Time-Series Forecasting Pipeline

```
 Aggregated Daily Sales [ (t0, y0), (t1, y1), ... (tn, yn) ]
                            │
                            ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    Data Preprocessing                       │
 │  - Missing date zero-filling                                │
 │  - Outlier clipping (3-sigma winsorization)                 │
 └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     Model Selection                         │
 │  - Dense regular sales: Exponential Smoothing (Holt-Winters)│
 │  - Intermittent / sporadic sales: Croston's Method          │
 │  - Short history (< 14 days): Weighted Moving Average       │
 └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Inference & Uncertainty Bounds               │
 │  - Point estimate (P50 median projection)                   │
 │  - P10 (optimistic buffer) & P90 (conservative safety)      │
 └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
 Projected Daily Demand Array [ (t+1, ŷ1), ... (t+h, ŷh) ]
```

---

## 3. Evaluation & Backtesting Metrics

To ensure forecasting accuracy, the service computes rolling backtests using:
* **MAE (Mean Absolute Error):** Measures average magnitude of forecast errors in unit terms:
  $$\text{MAE} = \frac{1}{n} \sum_{t=1}^n |y_t - \hat{y}_t|$$
* **RMSE (Root Mean Squared Error):** Penalizes large deviations more heavily:
  $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2}$$
* **WAPE (Weighted Absolute Percentage Error):** Robust metric for retail demand that avoids division-by-zero on days with zero sales:
  $$\text{WAPE} = \frac{\sum |y_t - \hat{y}_t|}{\sum y_t}$$
