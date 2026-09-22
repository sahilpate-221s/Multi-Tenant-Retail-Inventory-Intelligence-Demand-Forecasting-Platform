# StockPilot — Security Model & Hardening

This document outlines the security architecture, threat model, authentication mechanisms, and cross-tenant data isolation enforcement in StockPilot.

---

## 1. Multi-Tenant Isolation (Tenant Defense in Depth)

### 1.1 Architectural Guarantees
* **Store Context Propagation:** Authentication middleware extracts `storeId` directly from verified JWT claims. Clients cannot specify or override `storeId` in request bodies or query params.
* **Repository-Level Filtering:** Every database access layer function explicitly scopes operations with `eq(table.storeId, auth.storeId)`.
* **Cross-Tenant Test Suite:** StockPilot includes an automated test suite with over 20 specific cross-tenant test cases (`*.crossTenant.test.ts`) that actively verify Store A cannot read, update, or delete Store B's records under any circumstance.

---

## 2. Authentication & Credential Security

* **Password Hashing:** Passwords are never stored in plaintext. They are hashed using `bcrypt` with salt cost 12.
* **Dual-Token System:**
  * **Access Token:** Short-lived (15 minutes), signed with `JWT_ACCESS_SECRET` (HS256). Transmitted in `Authorization: Bearer <token>` headers.
  * **Refresh Token:** Long-lived (30 days), stored as a SHA-256 hash in the `refresh_tokens` table. Sent strictly via `HttpOnly`, `Secure`, `SameSite=Lax` cookies to prevent XSS exfiltration.
* **Token Invalidation:** Logout or password changes immediately revoke all active refresh tokens in the database.

---

## 3. Input Validation & Injection Defenses

* **Schema Validation:** Every API route enforces strict input validation using **Zod** schemas. Unexpected properties are stripped or rejected before reaching controller logic.
* **SQL Injection Prevention:** All SQL interactions execute through **Drizzle ORM** parameterized queries. Raw string concatenations in SQL are prohibited.
* **Rate Limiting:** Express-rate-limit protects sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/ai/chat`) to thwart brute force and denial of service attacks.
* **Helmet Security Headers:** Content-Security-Policy (CSP), HSTS, and X-Content-Type-Options headers are enforced on all HTTP responses.
