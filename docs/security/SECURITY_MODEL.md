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

---

## 4. Cross-Site Request Forgery (CSRF) Mitigation

StockPilot employs an architectural, defense-in-depth model that structurally eliminates standard CSRF attack vectors without requiring synchronizer CSRF tokens on every API endpoint:

### 4.1 Header-Based Bearer Token Authentication
* **No Auto-Attachment:** All data-modifying business endpoints (`/api/products`, `/api/inventory`, `/api/sales`, `/api/purchase-orders`, etc.) require an `Authorization: Bearer <accessToken>` HTTP header evaluated by `requireAuth` middleware.
* **Browser Sandbox Constraints:** Web browsers **never** automatically attach custom headers (such as `Authorization`) to cross-origin requests originating from third-party sites (`<form action="...">`, `<img>`, `<iframe>`, `<script>`).
* **CORS Preflight Enforcement:** Any JavaScript-based cross-origin request (`fetch` / `XHR`) attempting to attach an `Authorization` header triggers a mandatory CORS Preflight (`OPTIONS`) check. StockPilot strictly restricts `Access-Control-Allow-Origin` to the designated `FRONTEND_URL` (or `http://localhost:5173` in local development). Unapproved origins are rejected before requests execute.

### 4.2 Refresh Cookie Defenses
The only credential maintained in a browser cookie is the long-lived `refreshToken`, strictly isolated with the following configuration:
* **`SameSite: "lax"`:** Modern browsers never attach `SameSite=Lax` cookies to cross-site state-changing requests (such as POST forms triggered from external websites).
* **`Path: "/api/auth"`:** The refresh cookie is never transmitted on general API calls, limiting exposure solely to `/api/auth/refresh` and `/api/auth/logout`.
* **`HttpOnly: true`:** Prevents client-side scripts from reading token contents, neutralizing XSS credential exfiltration.
* **`Secure: true` (Production):** Enforces HTTPS transmission exclusively.
* **Response Secrecy:** Even if an attacker attempted a cross-site POST to `/api/auth/refresh`, browser Same-Origin Policy (SOP) prevents the attacking site from reading the newly issued access token returned in the response body.

---

## 5. Secure Logging & Sensitive Data Protection

StockPilot enforces strict guidelines and automated safeguards against accidental leakage of passwords, tokens, API keys, and Personally Identifiable Information (PII) into log streams:

### 5.1 Automated Pino Logger Redaction
All structured HTTP request and response logging utilizes **Pino** (`apps/backend/src/lib/logger.ts`) with automated redaction filters:
```typescript
const SENSITIVE_FIELDS = ["password", "passwordHash", "token", "accessToken", "refreshToken", "apiKey", "authorization"];
```
Any occurrences of these keys in request bodies, headers, query parameters, or error payloads are automatically masked with `[REDACTED]` prior to serialization.

### 5.2 Codebase Console Log Audit Results
A formal audit of all `console.*` statements across `apps/backend/src/` verified:
* **No Password or Token Output:** Controllers log static context messages combined with error classes (e.g., `console.error("Login error:", err)`), where `err` is an instance of `AuthError` containing only error codes and sanitized messages. Plaintext passwords and JWTs are never logged.
* **No PII in Error Responses:** Unhandled internal server errors respond to clients with generic errors (`{ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }`), preventing stack traces, database schema details, or raw inputs from escaping to end users.
* **AI Tool Execution Safety:** The AI assistant orchestrator logs only query intent and function names (`[AI] Round X - tool calls requested: [name]`), never exposing credentials or private tenant context to external logs.

