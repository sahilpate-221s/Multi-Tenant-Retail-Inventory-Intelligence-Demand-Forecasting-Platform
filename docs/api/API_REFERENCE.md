# StockPilot — REST API Reference

All requests must be made over HTTPS. Responses follow a standardized JSON envelope structure:
* **Success**: `{ "success": true, "data": { ... } }`
* **Error**: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable detail" } }`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new tenant store and sets the initial user as `owner`.
* **Payload**:
  ```json
  {
    "storeName": "Retail Hub",
    "email": "owner@retailhub.com",
    "password": "StrongPassword123!"
  }
  ```
* **Response (201)**: `{ "success": true, "data": { "storeId": "...", "userId": "...", "email": "..." } }`

### `POST /api/auth/login`
Authenticates user credentials. Returns short-lived access token in body and sets long-lived `refreshToken` in an HTTP-only secure cookie.
* **Payload**:
  ```json
  { "email": "owner@retailhub.com", "password": "StrongPassword123!" }
  ```
* **Response (200)**: `{ "success": true, "data": { "accessToken": "...", "user": { ... } } }`

### `POST /api/auth/refresh`
Rotates and issues a new access token using the HTTP-only cookie.
* **Response (200)**: `{ "success": true, "data": { "accessToken": "..." } }`

### `POST /api/auth/logout`
Revokes the refresh token and clears the authentication cookie.

---

## 2. Inventory & Catalog (`/api/inventory`, `/api/products`)

### `GET /api/inventory`
Lists all stock items for the authenticated store, including quantity on hand and reorder thresholds.

### `PATCH /api/inventory/:id/adjust`
Adjusts stock quantity up or down with mandatory audit reason code.
* **Payload**: `{ "adjustment": 15, "reasonCode": "RESTOCK_SHIPMENT", "notes": "PO-1044 received" }`

### `GET /api/products`
Retrieves products catalog with pagination, category filter, and SKU search.

### `POST /api/products`
Creates a new product record.

---

## 3. Analytics & Forecasting (`/api/forecasting`, `/api/recommendations`)

### `GET /api/forecasting/products/:id`
Retrieves ML-generated demand projections for the upcoming 7, 14, and 30-day windows.

### `GET /api/recommendations`
Lists active automated restock suggestions with lead-time risk scoring and recommended quantities.

### `POST /api/recommendations/:id/accept`
Converts a recommendation into an active Purchase Order automatically.

---

## 4. AI Copilot (`/api/ai/chat`)

### `POST /api/ai/chat`
Conversational inventory assistant powered by LLM tool calling.
* **Payload**: `{ "question": "Which 3 items are closest to stockout this week?" }`
* **Response**: Returns markdown-formatted answer with cited store data.
