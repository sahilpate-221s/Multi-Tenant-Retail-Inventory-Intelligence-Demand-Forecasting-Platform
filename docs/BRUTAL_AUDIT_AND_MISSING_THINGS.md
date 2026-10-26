# 🚨 StockPilot — Brutal Honest Audit & Missing Things Guide
*Ekdum Khulke Sach: User aur Developer Dono Nazariye se Kya-Kya Missing Hai, Kahan System Kamzor Hai, Aur Ise Perfect Kaise Banayein*

> 📌 **Full Document Path:** [`docs/AUDIT_AND_MISSING_THINGS_BRUTAL_HONESTY.md`](docs/AUDIT_AND_MISSING_THINGS_BRUTAL_HONESTY.md)

---

## 🎯 Is Document Ka Maqsad

StockPilot ek bohot powerful retail POS aur inventory system ban chuka hai (isme Barcode Scanner, 3D Aisle Twin, Khata Ledger, AI Assistant sab hai). **Lekin sachai yeh hai ki koi bhi software pehle din perfect nahi hota.**

Agar aapko is software ko:
1. Kisi asli dukan par deploy karna hai, ya
2. Interviewer ke saamne confidently explain karna hai ki *"Isme kya limitations hain aur main ise scale kaise karunga"*,

Toh aapko iski **kamiyan (weaknesses) aur missing features** ki 100% jaankari honi chahiye. Yahan hum bina kisi parde ke, har ek kami ko detail mein discuss karenge.

---

# 📑 Index

1. [User / Shopkeeper ke Nazariye se Missing Features (Dukaan chalate waqt kya kami lagegi)](#1-user--shopkeeper-ke-nazariye-se-missing-features)
2. [Developer / Technical Architecture ke Nazariye se Missing Gaps (Engineering point of view)](#2-developer--technical-architecture-ke-nazariye-se-missing-gaps)
3. [Prioritized Roadmap: Pehle Kya Theek Karein (P0, P1, P2)](#3-prioritized-roadmap-pehle-kya-theek-karein)

---

# 1. User / Shopkeeper ke Nazariye se Missing Features 

Ek asli retail store (Kirana, Supermarket, Medical, Garments) chalane wale dukaandar ko yeh cheezein turant khaleengi:

---

### 1.1. Role-Based Permissions (Cashier vs Manager vs Owner) — 🔴 P0 (Critical) ✅ COMPLETED (Production Ready)
* **Abhi Kya Hai:** Jo bhi login karta hai, use sab kuch dikhta hai — kitna profit hua, wholesale purchase price (cost price) kya tha, pure mahine ki total kamai, aur settings.
* **Asli Dukan ki Problem:**
  * Dukaandar counter par apne 18-20 saal ke **helper ya cashier boy** ko baithata hai.
  * Cashier ko yeh **kabhi nahi dikhna chahiye** ki maalik ne yeh biscuit ₹7 mein khareeda hai aur ₹10 mein bech raha hai (Profit Margin leak ho jayega).
  * Cashier ko sirf **POS Counter Screen** milni chahiye. Wo na toh purani sales delete kar sake, na stock modify kar sake.
* **Kya Chahiye:**
  * Roles: `OWNER` (Full access), `MANAGER` (Stock + Purchase order), `CASHIER` (Sirf Billing Counter, cost price hidden, reports locked).

---

### 1.2. Direct Thermal Printer Support (Raw ESC/POS Printing) — 🔴 P0 (Critical)
* **Abhi Kya Hai:** Bill banne ke baad browser ka standard `window.print()` khulta hai (jisme bada PDF preview aata hai, 'Print' dabana padta hai, aur A4 size jaisa layout hota hai).
* **Asli Dukan ki Problem:**
  * Bheed ke waqt grahak line mein khada hota hai. Dukaandar ke paas 58mm ya 80mm ka chota thermal receipt printer (TVS, Epson, NGX, Bluetooth) hota hai.
  * Jaise hi 'Complete Sale' dabayein, printer se **1 second ke andar bina kisi popup ke seedha karrr-karrr karke thermal receipt bahar aani chahiye aur paper cut hona chahiye**.
* **Kya Chahiye:**
  * Web Bluetooth API ya Web USB API / RawBT integration taaki ESC/POS commands seedhe thermal printer ko jayein.

---

### 1.3. Returns, Refunds & Item Exchange Flow — ✅ COMPLETED (Production Ready)
* **Status:** Implemented on POS Counter Screen & Backend API (`POST /api/returns/process`).
* **Built Capabilities:**
  1. **POS Return / Exchange Button:** POS header par dedicated button jahan purana Invoice No search karo ya recent bills picker se select karo.
  2. **Multi-Item Return with Quantities & Reasons:** Har item ka returnable quantity stepper (`quantity - alreadyReturned`), and reason code ("Customer exchange", "Defective/Damaged", "Wrong variant", etc.).
  3. **Mode A — Direct Cash Refund:** Counter cash drawer se cash refund voucher generate karta hai aur stock wapas shelf par count kar deta hai.
  4. **Mode B — Item Exchange in Current Bill:** Wapas aaye saaman ka credit active bill par apply ho jata hai (e.g. ₹50 soap return karke ₹185 shampoo lena, toh grahak ko sirf ₹135 net dena hoga).
  5. **Inventory & Movement Ledger:** Inventory table mein `currentStock` turant restore hota hai aur `inventoryMovements` ledger mein `reason: "return"` log hota hai. Over-return prevention (HTTP 409) safeguards duplicate returns.

---

### 1.4. Indian GST / Tax Slabs Compliance — ✅ COMPLETED (Production Ready)
* **Status:** Implemented across Database Schema, Product Setup, POS Cart & Tax Invoices.
* **Built Capabilities:**
  1. **Indian GST Slabs Dropdown:** `0%` (Nil GST - Milk, Atta, Dal), `5%` (Edible Oil, Sugar, Tea), `12%` (Butter, Cheese, Chips), `18%` (Soaps, Biscuits, Toothpaste), `28%` (Aerated Soft Drinks).
  2. **HSN / SAC Code:** Product creation modal, quick-add popup, and database schema mein HSN code support.
  3. **Store GSTIN:** Store profile setup mein 15-character official Indian GSTIN (e.g. `24AAAAA0000A1Z5`).
  4. **MRP-Inclusive GST Formula:** Real retail FMCG formula: $\text{Taxable} = \text{MRP} / (1 + \text{Rate}/100)$, $\text{Total GST} = \text{MRP} - \text{Taxable}$, $\text{CGST} = \text{GST} / 2$, $\text{SGST} = \text{GST} / 2$.
  5. **Legal Tax Invoice Breakdown Table:** Bill receipt par legal HSN/SAC summary table showing Taxable Value, CGST Rate & Amount, SGST Rate & Amount, and Total Tax.

---

### 1.5. Offline Mode (Internet Chala Gaya Toh?) — 🟡 P1 (Important)
* **Abhi Kya Hai:** StockPilot pure network par chalta hai. Agar Wi-Fi cut gaya ya mobile hotspot disconnect hua, toh API call fail ho jayegi.
* **Asli Dukan ki Problem:**
  * Bharat mein shaam ko peak time par internet jana aam baat hai. Counter par 10 grahak khade hain, internet band hone se dukan band nahi ki ja sakti.
* **Kya Chahiye:**
  * Progressive Web App (PWA) + IndexedDB offline caching.
  * Internet na hone par bhi bill banega aur IndexedDB mein save ho jayega. Jaise hi internet aayega, saare bills backend server par sync ho jayenge (Offline-first architecture).

---

### 1.6. Barcode Sticker Printing (For Loose Items) — 🟡 P1
* **Abhi Kya Hai:** System barcode number generate kar deta hai (e.g. `8908239102`), lekin un barcodes ko sticker paper par print karne ka tool nahi hai.
* **Asli Dukan ki Problem:**
  * Dukaandar 1-1 kg ke daal, chawal, dry fruits ke packet khud banata hai. Use 24 stickers wali A4 sheet par barcode print karke packets par chipkana hota hai.
* **Kya Chahiye:**
  * "Print Barcode Sheet" utility jahan select karo kitne stickers print karne hain.

---

### 1.7. WhatsApp / SMS Digital Receipts — 🟢 P2 (Value Add)
* **Asli Dukan ki Problem:** Paper rolls mehenge aate hain aur grahak aksar paper bill phenk dete hain.
* **Kya Chahiye:**
  * Customer ka mobile number dalte hi WhatsApp API ya Twilio/Gupshup se 1 click mein message chala jaye: *"Patel Super Market: Thank you! Your bill of ₹450 is ready: [link]"*.

---

### 1.8. Day-End Cash Register Tally (Z-Report / Day Closing) — 🟢 P2
* **Asli Dukan ki Problem:**
  * Subah galle mein ₹1,500 chutta (opening balance) tha.
  * Din bhar mein ₹8,000 cash bika, aur ₹300 chai/safai wale ko diya (petty cash expense).
  * Raat ko galle mein ₹9,200 hona chahiye. Agar ₹9,000 nikla toh ₹200 ki chori/shortage kiski wajah se hui?
* **Kya Chahiye:**
  * Day Open / Day Close register screen jahan Cash Drawer count match kiya jaye.

---

# 2. Developer / Technical Architecture ke Nazariye se Missing Gaps

---

### 2.1. Stock Deduction Concurrency & Race Conditions (Critical DB Flaw) — ✅ COMPLETED (Production Ready)
* **Status:** Resolved using Atomic SQL Decrements with HTTP 409 Conflict rejection.
* **Built Capabilities:**
  * In `sales.service.ts`, non-atomic read-then-write was completely replaced with atomic SQL decrement:
    ```sql
    UPDATE inventory 
    SET current_stock = current_stock - $quantity, updated_at = NOW() 
    WHERE store_id = $storeId AND product_id = $productId AND current_stock >= $quantity 
    RETURNING *;
    ```
  * Agar concurrent billing counters aakhri packet ek sath bechte hain, toh pehla counter succeed karega aur doosre counter ko turant **HTTP 409** informative error milega: *"Stock out! Item kisi aur counter par bik gaya ya stock kam hai (Available: 0, Requested: 1)"*. Stock kabhi negative nahi ho sakta.

---

### 2.2. Soft Deletes vs Hard Deletes (Data Integrity & Foreign Keys) — ✅ COMPLETED (Production Ready)
* **Status:** Fully implemented across `products`, `suppliers`, and `categories`.
* **Built Capabilities:**
  * Schema mein `deleted_at: timestamp` column add kiya gaya aur migration `0016_real_maximus.sql` ke through apply kiya gaya.
  * Delete API ab destructive `DELETE FROM` ke badle Soft Delete karta hai (`deletedAt: new Date()`, `isActive: false`).
  * Catalog queries, barcode scans, aur listings `isNull(table.deletedAt)` se filter hoti hain, jabki purani sales receipts aur ledger reports deleted products aur suppliers ke sath bhi bina kisi crash ya orphan error ke 100% intact rehte hain.

---

### 2.3. Background Job Queue (BullMQ + Redis) Reliability — ✅ COMPLETED (Production Ready)
* **Status:** Production-grade Redis reconnection strategy, BullMQ exponential backoff, Dead Letter Queue (DLQ) alerts, aur Bull-Board Dashboard integrated.
* **Built Capabilities:**
  * **Exponential Backoff Retries:** Har job ke liye 5 retries configured (`attempts: 5`, `backoff: { type: 'exponential', delay: 2000 }`, `removeOnFail: false`).
  * **Dead Letter Queue (DLQ) Alerting:** Jab koi job 5 automated retries ke baad bhi fail hoti hai, worker alert trigger karta hai aur shop owner ke notifications table mein `IMPORT_FAILED (DLQ)` critical alert insert karta hai.
  * **Bull-Board Visual Dashboard:** Platform-wide queue status aur failed/delayed jobs dekhne ke liye `@bull-board` UI router `/admin/queues` par mounted hai.
  * **Queue Observability Endpoint:** `GET /api/observability/queues` real-time waiting, active, completed, failed counts aur dead-letter job diagnostics provide karta hai.

---

### 2.4. Row Level Security & Multi-Tenant Isolation — ✅ COMPLETED (Production Ready)
* **Status:** PostgreSQL Native Row Level Security (RLS) fully enabled & enforced with application role separation.
* **Built Capabilities:**
  * Migration `0017_row_level_security.sql` applied with `FORCE ROW LEVEL SECURITY` across 15 tenant tables (`products`, `inventory`, `sales`, `sale_items`, `suppliers`, `categories`, `purchase_orders`, etc.).
  * Policy checks `store_id = NULLIF(current_setting('app.current_store_id', true), '')::uuid`.
  * `withTenantContext(storeId, callback)` utility (`tenantContext.ts`) automatically switches to `stockpilot_app` and injects session tenant context.
  * Verified with `test_rls_isolation.mjs`: Even when an endpoint query intentionally omits `WHERE store_id = ...`, PostgreSQL's RLS engine physically blocks cross-tenant leaks (Store B received 0 rows from Store A).

---

### 2.5. Automated Testing & CI/CD Pipeline — ✅ COMPLETED (Production Ready)
* **Status:** Playwright E2E POS checkout test suite & GitHub Actions CI pipeline configured.
* **Built Capabilities:**
  * **Playwright Suite (`apps/frontend/e2e/posCheckout.spec.ts`):** Complete automated browser test verifying:
    1. Authenticates cashier/owner
    2. Enters barcode/SKU (`8901030000014`) into POS search
    3. Adds product to cart with GST calculation
    4. Clicks `⚡ Complete & Bill`
    5. Verifies Tax Invoice cash memo receipt display.
  * **GitHub Actions Workflow (`.github/workflows/ci.yml`):** Runs on push to `main` and Pull Requests with dual parallel jobs:
    - Backend: PostgreSQL 16 + Redis service containers, DB migrations, TypeScript compile check (`tsc --noEmit`), and test runner.
    - Frontend: Dependency install, TypeScript compile check, and production build (`npm run build`).

---

### 2.6. Centralized Logging & Error Telemetry — ✅ COMPLETED (Production Ready)
* **Status:** Sentry-ready centralized telemetry service, frontend crash boundary, and POS scanner diagnostics operational.
* **Built Capabilities:**
  * **Backend Telemetry Hub (`lib/telemetry.ts` & `POST /api/telemetry/errors`):** Captures structured error telemetry packets with `eventId`, `timestamp`, `source`, `storeId`, `userId`, `role`, and stack trace, formatted for Sentry / OpenTelemetry / Datadog.
  * **Frontend Telemetry Reporter (`apps/frontend/src/lib/telemetry.ts`):** Automatically captures uncaught window errors, unhandled promise rejections, barcode scan failures (`reportScanFailure`), and network timeouts (`reportNetworkTimeout`).
  * **React Error Boundary (`components/ErrorBoundary.tsx`):** Wraps application root, catches runtime render exceptions, reports diagnostics to telemetry, and provides cashier with a "Reload Screen" recovery modal.

---

# 3. Prioritized Roadmap: Pehle Kya Theek Karein

| Priority | Feature / Gap | Perspective | Effort | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Completed** | **Atomic Stock Decrement (Concurrency - 2.1)** | Developer | Done ✅ | Stock kabhi negative nahi hoga, concurrent sales safe |
| **Completed** | **Soft Deletes vs Hard Deletes (2.2)** | Developer | Done ✅ | `deleted_at` timestamp, foreign key reports 100% intact |
| **Completed** | **Queue Reliability & Bull-Board (2.3)** | Developer | Done ✅ | 5x exponential retries, DLQ alerts, /admin/queues dashboard |
| **Completed** | **Row Level Security Multi-Tenant (2.4)** | Developer | Done ✅ | PostgreSQL RLS engine-level cross-tenant isolation |
| **Completed** | **Automated Testing & CI/CD Pipeline (2.5)** | Developer | Done ✅ | Playwright E2E POS checkout + GitHub Actions CI |
| **Completed** | **Centralized Logging & Telemetry (2.6)** | Developer | Done ✅ | Instant scan failure alerts, Sentry-ready error hub |
| **Completed** | **Cashier vs Owner Role (RBAC - 1.1)** | User & Dev | Done ✅ | Cashier profit margin/cost price hidden, settings locked |
| **Completed** | **Return & Exchange on POS (1.3)** | User & Dev | Done ✅ | Multi-item returns, cash refund, exchange credit on live bill |
| **Completed** | **Indian GST Slabs & HSN Codes (1.4)** | User & Dev | Done ✅ | HSN codes, GSTIN, 0/5/12/18/28% slabs, legal tax invoice table |
| **P0 (Next)** | **Raw Thermal Print (ESC/POS - 1.2)** | User | 3 Hours | 1-second silent bill printing at counter |
| **P1 (Next)** | **Offline PWA Sync (IndexedDB - 1.5)** | User & Dev | 8 Hours | Net band hone par bhi dukaan nahi rukegi |
| **P2 (Later)** | **WhatsApp Bill Sharing (1.7)** | User | 3 Hours | Paper bachaega, customer delight |
