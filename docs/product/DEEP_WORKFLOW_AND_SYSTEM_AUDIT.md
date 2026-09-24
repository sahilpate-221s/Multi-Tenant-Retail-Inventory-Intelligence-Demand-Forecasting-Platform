# StockPilot — Deep Operational, Technical & Merchant Workflow Audit (Phase 2)
**Author:** Principal Product Architect & Retail Systems Engineer  
**Date:** 24 September 2026  
**Companion Documents:**  
* [`docs/product/USER_EXPERIENCE_AND_WORKFLOW_AUDIT.md`](file:///c:/Users/Sahil%20Patel/Music/stockpilot_project/stockpilot/docs/product/USER_EXPERIENCE_AND_WORKFLOW_AUDIT.md)  
* [`docs/product/WORKFLOW_AUTOMATION_SOLUTIONS_SPEC.md`](file:///c:/Users/Sahil%20Patel/Music/stockpilot_project/stockpilot/docs/product/WORKFLOW_AUTOMATION_SOLUTIONS_SPEC.md)

---

## 1. Executive Summary & Objective

In the first pass of the audit, we identified the high-level disconnect between StockPilot's deterministic intelligence and the daily merchant experience (tab fatigue, catalog onboarding, and supplier dispatch). 

In this **Phase 2 Deep Audit**, we conducted an exhaustive line-by-line inspection of the actual database schema (`schema.ts`), frontend pages, backend controllers, and daily counter operational flows. We identified **20 hidden systemic frictions, broken loops, and operational gaps** that make the system impractical for real-world retail store owners and small businesses.

---

## 2. The 20 Hidden Problems & Broken Loops (Codebase-Verified)

### Category A: The Broken Operational Loops (Data Enters, But Dead-Ends)

#### 1. The Reorder-to-PO Disconnect (Critical Broken Loop)
* **The Code Reality:** In `RecommendationCard.tsx` (line 37), clicking **"Mark Ordered"** executes:
  ```ts
  updateStatus.mutate({ id: rec.id, status: "ordered" });
  ```
  It **only** updates the recommendation row in `reorder_recommendations`. 
* **The Problem:** It **never creates an actual record in `purchase_orders`**!
* **The Impact:** The product never enters the incoming pipeline (`incomingStock` stays 0), no expected arrival date is recorded, and the merchant has no purchase order to verify or receive when the delivery truck arrives. The loop is broken at the exact moment of decision.

#### 2. The Ghost Purchase Orders Module
* **The Code Reality:** The backend has a complete purchase orders API (`/api/purchase-orders`, `purchaseOrders.service.ts`).
* **The Problem:** In `apps/frontend/src/routes.tsx`, **there is no route for `/purchase-orders`**! 
* **The Impact:** The merchant has no screen to view pending purchase orders, cancel an order, inspect what is arriving this week, or mark an order as received. The entire procurement lifecycle is invisible in the UI.

#### 3. Single-Item PO Schema Architecture Flaw
* **The Code Reality:** Look at `schema.ts` (lines 242-256):
  ```ts
  export const purchaseOrders = pgTable("purchase_orders", {
    productId: uuid("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    ...
  });
  ```
* **The Problem:** A purchase order table references a **single product**. There is no `purchase_order_items` table!
* **The Impact:** In real retail, when Rajesh orders from a distributor (e.g. Amul or Unilever), he places an order for 30 SKUs at once. Under the current schema, placing one order creates 30 separate isolated PO records. There is no invoice total, no supplier invoice reference number, and no consolidated delivery tracking.

#### 4. The Dead Stock "Action Required" Dead-End
* **The Code Reality:** `DeadStockPage.tsx` displays a bold banner: `TOTAL WORKING CAPITAL IMMOBILIZED ... ACTION REQUIRED` with stagnation indexes (e.g., score 85).
* **The Problem:** There is **zero action capability on the page**. No button to trigger a clearance discount, no return-to-vendor RMA button, no write-off / donation button, and no bundle recommendation.
* **The Impact:** The merchant is told they are losing money, but given zero software tools to recover that capital.

#### 5. Stockout Risks Dead-End
* **The Code Reality:** `StockoutRisksPage.tsx` lists items with `CRITICAL` risk running out in `0.8 days`.
* **The Problem:** There is no "Restock Now" or "Draft PO" action on the card.
* **The Impact:** The user must write down the SKU on physical paper, navigate away to another tab, search for the item, and figure out how to order it.

---

### Category B: Counter Operations & Retail POS Bottlenecks

#### 6. POS Dropdown 100-SKU Cliff (Unusable for Real Catalogs)
* **The Code Reality:** In `SalesPage.tsx` (lines 473-479):
  ```ts
  const { data: productsData } = useProducts({
    page: 1,
    pageSize: 100,
    sortBy: "name",
    isActive: "true",
  });
  ```
* **The Problem:** The sale modal populates a native HTML `<select>` dropdown hardcoded to page 1 (100 items).
* **The Impact:** If a grocery or retail store has 1,200 products, items from 101 to 1,200 **cannot even be selected**. Cashiers cannot ring up 90% of their store inventory!

#### 7. Zero Barcode Scanner Integration at Checkout
* **The Code Reality:** Recording a counter sale requires opening a modal, clicking a dropdown, scrolling through text, typing a quantity, and clicking save.
* **The Problem:** Real retail counters process 1 customer every 20 seconds using a USB barcode scanner.
* **The Impact:** Typing and clicking modals for every customer creates a 3-minute delay per checkout. In rush hours, checkout counters will simply refuse to use StockPilot.

#### 8. Missing Customer Details, Payment Modes & Cash Drawer Reconciliation
* **The Code Reality:** `sales` table only stores `id, storeId, saleDate, totalAmount`.
* **The Problem:**
  * No Payment Method (`cash`, `upi_qr`, `credit_card`, `store_credit`).
  * No Customer Name / Phone Number.
  * No Invoice / Receipt Number (e.g. `INV-2026-0891`).
  * No Tax (GST / VAT) or Discount breakdown.
* **The Impact:** At the end of the day, Rajesh counts ₹24,000 cash in his drawer. He has no way to check StockPilot to see if ₹24,000 is the correct cash amount vs UPI collections.

#### 9. No Customer Credit / Khata (Udhaar) Tracking
* **The Retail Reality:** Over 40% of neighbourhood retail transactions occur on informal store credit ("Pay at end of month").
* **The Problem:** StockPilot has no customer accounts receivable or credit ledger. If a customer doesn't pay immediately, the sale cannot be recorded without skewing revenue.

---

### Category C: Inventory Management & Supplier Network Frictions

#### 10. The 2,000-Row Unpaginated Inventory Wall
* **The Code Reality:** In `InventoryPage.tsx` (line 12):
  ```ts
  const { data: inventory } = useInventory();
  ```
* **The Problem:** There is **no search bar, no category filter, and no pagination**.
* **The Impact:** When a store has 1,500 products, the browser attempts to render all 1,500 rows simultaneously. Finding one specific item requires manual Ctrl+F or endless scrolling.

#### 11. Hidden Supplier Intelligence (Backend Exists, Frontend Zero UI)
* **The Code Reality:** The backend database schema contains `supplier_products` with `leadTimeDays`, `moq` (Minimum Order Quantity), and `cost`.
* **The Problem:** The frontend has **zero inputs or screens to view or edit these fields**.
* **The Impact:** A merchant cannot link a product to a supplier, configure minimum order quantities, or set custom supplier lead times from the web UI.

#### 12. Blind Restock Uploads (No Unit Costs or Supplier Invoice Numbers)
* **The Code Reality:** In `BulkRestockPage.tsx`, the CSV format only accepts `product,quantity` or `sku,quantity`.
* **The Problem:** It does not capture purchase cost or supplier invoice number.
* **The Impact:** Wholesale prices fluctuate every week. Restocking inventory without capturing the new purchase cost makes COGS (Cost of Goods Sold) and gross margin calculations inaccurate over time.

#### 13. Product Registration Disconnect (Initial Stock & Supplier Omission)
* **The Code Reality:** In `ProductFormModal.tsx`, when registering a new physical SKU, fields are limited to `name, sku, barcode, categoryId, costPrice, sellingPrice`.
* **The Problem:** No field for **"Initial Stock on Shelf"** and no field for **"Primary Supplier"**.
* **The Impact:** To add an item on the shelf, the merchant must:
  1. Create product in `/products`.
  2. Navigate to `/inventory`.
  3. Search the product.
  4. Open Adjust Stock modal, select reason, and enter count.
  5. Navigate to `/suppliers` to link the vendor.
  What should take 15 seconds takes 5 separate page visits.

#### 14. Missing Barcode Generation & Thermal Shelf Label Printing
* **The Retail Reality:** Small stores sell loose grains, local bakery items, or hardware goods that do not have manufacturer UPC barcodes.
* **The Problem:** StockPilot cannot generate auto-incrementing barcodes or format print sheets for standard thermal sticker printers (e.g. 50mm x 25mm label sheets).
* **The Impact:** Retailers cannot barcode their unbranded stock for fast scanning.

---

### Category D: Compliance, Perishables & Financial Realities

#### 15. Zero Batch & Expiry Date Tracking (Perishables Blindspot)
* **The Code Reality:** No `batch_number` or `expiry_date` fields exist in the inventory or product schemas.
* **The Problem:** In FMCG, grocery, dairy, and pharmaceuticals, stock expires.
* **The Impact:** StockPilot cannot alert the merchant when milk or yogurt will spoil in 48 hours (FEFO - First Expired, First Out). The merchant discovers expired goods only when a customer complains or throws them away.

#### 16. Supplier Accounts Payable (Vendor Credit Terms)
* **The Retail Reality:** Retailers buy from distributors on 15 to 30 day credit terms.
* **The Problem:** StockPilot tracks inventory units, but tracks zero financial debt to suppliers.
* **The Impact:** The store owner cannot answer: *"How much money do I owe Amul Dairy this Friday?"*

#### 17. Single-Store / Single-Warehouse Confinement
* **The Code Reality:** In `schema.ts`, `users.storeId` is a single foreign key.
* **The Problem:** A retailer with a storefront plus a back storage godown (or two retail branches) cannot switch locations or record **Stock Transfers** between godown and shelf.

#### 18. Absence of Role-Based Access Control (RBAC)
* **The Code Reality:** Every authenticated user token has unrestricted access to all backend endpoints.
* **The Problem:** The store owner cannot hire a counter clerk or cashier without giving them full visibility into profit margins, financial analytics, supplier agreements, and settings.

#### 19. Passive Dashboard Analytics vs. Operational Action
* **The Code Reality:** `DashboardPage.tsx` focuses on 3D canvas visuals, 30-day revenue trends, and turnover metrics.
* **The Problem:** It lacks an urgent operational widget for immediate daily tasks (critical stockouts, incoming deliveries, expired items).

#### 20. Dead Notifications (No Actionable Links)
* **The Code Reality:** `NotificationsPage.tsx` displays plain text logs with a timestamp and "Mark Read" button.
* **The Problem:** Notifications do not have deep-linked action buttons (e.g., "Reorder SKU Now", "Confirm Delivery").

---

## 3. High-Priority Solutions & Technical Architecture Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   STOCKPILOT TRANSFORMATION ARCHITECTURE                         │
├───────────────────────────────┬──────────────────────────────────────────────────┤
│ 1. Complete The Reorder Loop  │ • Auto-create PO records on recommendation accept│
│                               │ • Build dedicated `/purchase-orders` management UI│
│                               │ • Multi-item POs with supplier invoice totals   │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Real-World POS Experience  │ • Search-as-you-type + USB barcode scanner hook │
│                               │ • Payment method splits (Cash, UPI, Card, Udhaar)│
│                               │ • Printable thermal receipts & bill generation   │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ 3. Intelligent Procurement    │ • UI for Supplier MOQ, Lead Times & Wholesale Cost│
│                               │ • Supplier credit terms & payment due tracking   │
│                               │ • 1-Click WhatsApp purchase order dispatch       │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Store Operations & Shelf   │ • Initial stock & supplier in "Add Product" modal│
│                               │ • Rapid barcode shelf audit mode (shrinkage log) │
│                               │ • Expiry date & batch alerts for FMCG/grocery    │
└───────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 4. Immediate Action Matrix

| Area | Quick Win (1-2 Days) | Full Implementation |
| :--- | :--- | :--- |
| **Procurement Loop** | Add `/purchase-orders` route & view; auto-insert PO on "Mark Ordered". | Multi-item PO schema, supplier invoice reconciliation, WhatsApp deep links. |
| **Sales POS** | Replace 100-item dropdown with debounced product search & barcode scan input. | Split payment methods (Cash/UPI), thermal receipt printing, cash drawer summary. |
| **Catalog Management** | Add "Initial Stock" & "Supplier" fields directly into `ProductFormModal`. | CSV template bulk onboarding with auto-category & initial balance generation. |
| **Inventory Ledger** | Add search input, category filter, and 25-row pagination to `/inventory`. | Rapid USB barcode cycle audit runner with shrinkage calculation. |
| **Operational Command** | Add a "Morning Action Center" card to `/dashboard` highlighting 3 critical items. | Daily 8:00 AM push digest (WhatsApp/Email) with 1-click approvals. |
