# ADR-005: Dual-Token Authentication with HTTP-Only Refresh Cookies

## Status
Accepted

## Context
StockPilot is a multi-tenant B2B platform handling proprietary sales, margin, and inventory data. Storing long-lived JWTs in browser `localStorage` leaves sessions vulnerable to Cross-Site Scripting (XSS) token exfiltration. Conversely, pure server-side session cookies create state synchronization issues across load-balanced cloud containers.

## Decision
We implemented a **Dual-Token Authentication Architecture**:
1. **Short-Lived Access Token (JWT):** 15-minute expiration, held strictly in React in-memory state. Transmitted in the `Authorization: Bearer <token>` header.
2. **Long-Lived Refresh Token:** 30-day expiration, stored as a SHA-256 hash in the `refresh_tokens` database table. Transmitted exclusively via an `HttpOnly`, `Secure`, `SameSite=Lax` cookie restricted to the `/api/auth` path.

### Rationale
1. **XSS Immunity for Long-Lived Credentials:** JavaScript cannot read `HttpOnly` cookies, preventing malicious scripts from stealing the user's persistent session.
2. **Immediate Invalidation (Revocation):** Because the refresh token hash is checked in the database during rotation, compromised accounts can be logged out immediately by revoking the database row.
3. **Stateless API Verification:** Access tokens are verified using fast in-memory asymmetric/HMAC signature checks without querying the database on every microsecond API request.

## Consequences
* **Positive:** Enterprise security posture, seamless silent background token refreshes via Axios/fetch interceptors, and instantaneous session revocation capability.
* **Negative:** Requires handling token rotation race conditions when multiple parallel HTTP requests trigger a refresh simultaneously.
