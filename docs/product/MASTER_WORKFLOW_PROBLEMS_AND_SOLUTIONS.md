# StockPilot — Master Workflow, Problems & Solutions Architecture
**Document ID:** `SP-PROD-MASTER-2026-01`  
**Status:** Canonical Product & Engineering Blueprint  
**Audience:** Founder, Core Full-Stack Engineers, Product Architects  
**Consolidation Source:** Synthesized from User Journey Audits, Deep Schema & Code Audits, and Workflow Automation Specifications.

---

## 1. Executive Summary & The Retail Reality

### The Merchant Persona: "Rajesh", Independent Retailer
* **Store Profile:** Urban supermarket / general store (electronics, grocery, FMCG).
* **Inventory Scale:** 1,200 active SKUs, 2 checkout counters, 450 customer transactions/day, 8 primary distributors.
* **Daily Reality:** Rajesh works 13-hour days (8:00 AM – 9:30 PM). He deals with physical customers, haggles with suppliers, manages counter clerks, and counts physical cash.
* **The Core Truth:** **Shopkeepers will never sit at a desktop computer manually typing spreadsheet updates.** If software requires manual adjustments for every SKU or tedious navigation across 15 tabs, they will abandon it within 3 days.

> **The Golden Law of Retail SaaS:** Software must not be an additional chore on the merchant's to-do list; it must eliminate 2 hours of existing daily chores.

---

## 2. What StockPilot Does Well vs. Why It Fails in Daily Use

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│  WHAT STOCKPILOT ALREADY DOES AUTOMATICALLY  │       WHERE THE SYSTEM BREAKS DOWN           │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 1. Atomic POS Inventory Decrements           │ 1. Recommendations don't create real POs     │
│ 2. Deterministic Safety Stock Math           │ 2. No `/purchase-orders` screen in frontend  │
│ 3. Automated Demand Velocity & Anomaly Scans │ 3. POS modal limited to 100 items (dropdown) │
│ 4. Fuzzy Name/SKU Match Bulk Restock Parsing │ 4. Inventory table has no search or filters  │
│ 5. Multi-Tenant Isolated PostgreSQL Data     │ 5. Dead Stock reports problems with 0 actions│
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Comprehensive Master Breakdown: All 20 Problems & Engineering Solutions

---

### CATEGORY 1: The Broken Procurement & Replenishment Loop

#### Problem 1.1: Reorder-to-PO Disconnect (The Critical Dead-End)
* **Merchant Problem:** Rajesh visits `/reorder-recommendations`, reviews 5 urgent items, and clicks "Mark Ordered". He assumes StockPilot has tracked his order. However, incoming pipeline stays at 0, nothing shows up when the delivery truck arrives, and next week StockPilot still alerts him that the product is running out!
* **Code & Schema Root Cause:** In `RecommendationCard.tsx` (line 37), clicking "Mark Ordered" executes `updateStatus.mutate({ id: rec.id, status: "ordered" })`. In `recommendations.service.ts` (lines 89-100), this **only updates the status flag in `reorder_recommendations`**. It **never inserts a record into `purchase_orders`**!
* **The Solution:**
  1. Modify `updateRecommendationStatus` or create `convertRecommendationToPO`:
     * Auto-inserts a row into `purchase_orders` (`storeId`, `productId`, `supplierId`, `quantity: rec.recommendedQuantity`, `expectedArrivalDate: TODAY + leadTimeDays`, `status: "pending"`).
     * Automatically updates `inventory.incomingStock` or includes pending POs in intelligence queries.
  2. Updates `reorder_recommendations.status = "ordered"`.
  3. Displays a toast notification: *"Purchase Order created for [Supplier Name]. Expected arrival: [Date]"*.

#### Problem 1.2: The Ghost Purchase Orders Screen (Missing UI)
* **Merchant Problem:** Rajesh has placed orders with distributors, but cannot see what is arriving today, cannot verify what was delivered, and cannot cancel delayed orders.
* **Code & Schema Root Cause:** The backend has a complete purchase orders API (`/api/purchase-orders`, `purchaseOrders.service.ts`), but in `apps/frontend/src/routes.tsx` and `AppLayout.tsx`, **there is no route and no navigation link for `/purchase-orders`**.
* **The Solution:**
  1. Create `apps/frontend/src/pages/PurchaseOrdersPage.tsx` and register `/purchase-orders` in `routes.tsx` and sidebar navigation.
  2. Features:
     * Status tabs: `All`, `Pending`, `Received`, `Cancelled`.
     * Card/table showing: PO ID, Supplier Name, Product Name, SKU, Quantity, Expected Arrival Date, Status Badge.
     * **1-Click "Mark Received" button:** Calls `POST /api/purchase-orders/:id/receive`, which atomically increments `inventory.currentStock` and logs an audit movement (`reason: "purchase_order_receipt"`).
     * **1-Click "Cancel" button:** Calls `POST /api/purchase-orders/:id/cancel`.

#### Problem 1.3: Single-Item PO Schema Architecture Flaw
* **Merchant Problem:** When Rajesh calls Amul Dairy, he doesn't order just milk; he orders butter, cheese, paneer, and yogurt together. Creating 20 separate single-item POs creates 20 isolated records with no shared invoice number or total billing amount.
* **Code & Schema Root Cause:** `purchase_orders` in `schema.ts` (lines 242-256) is directly tied to a single `productId`. There is no `purchase_order_items` join table, no supplier invoice reference, and no purchase cost total.
* **The Solution:**
  * **Short-Term (Zero migration risk):** Group single-item POs by `supplierId` and `createdAt` date on the UI, displaying them as a consolidated distributor delivery batch.
  * **Long-Term (Target Schema):** 
    ```ts
    // purchase_orders (Header)
    export const purchaseOrders = pgTable("purchase_orders", {
      id: uuid("id").primaryKey().defaultRandom(),
      storeId: uuid("store_id").notNull().references(() => stores.id),
      supplierId: uuid("supplier_id").references(() => suppliers.id),
      poNumber: varchar("po_number", { length: 50 }).notNull(), // e.g. PO-2026-0042
      invoiceNumber: varchar("invoice_number", { length: 100 }), // Distributor bill number
      totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
      status: varchar("status", { length: 20 }).default("pending"),
      expectedDate: date("expected_date"),
      receivedAt: timestamp("received_at"),
      createdAt: timestamp("created_at").defaultNow(),
    });
    // purchase_order_items (Lines)
    export const purchaseOrderItems = pgTable("purchase_order_items", {
      id: uuid("id").primaryKey().defaultRandom(),
      purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      quantityOrdered: integer("quantity_ordered").notNull(),
      quantityReceived: integer("quantity_received").default(0),
      unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
    });
    ```

#### Problem 1.4: The "Supplier Last-Mile" Gap (No Dispatch Channel)
* **Merchant Problem:** Even if a PO is created in the database, suppliers don't log into StockPilot. Rajesh has to re-type the order into WhatsApp or dictate it over the phone.
* **Code & Schema Root Cause:** No client-side export or messaging integrations exist on PO records.
* **The Solution:**
  1. **1-Click WhatsApp PO Dispatch:**
     * Generate encoded WhatsApp URL: `https://wa.me/{supplierPhone}?text={encodedOrderText}`.
     * Pre-formatted message:
       ```text
       📦 *PURCHASE ORDER: PO-2026-089*
       Store: Rajesh Supermart
       Date: 24 Sept 2026
       Expected Delivery: 26 Sept 2026
       ---------------------------------
       1. Parle-G 250g (SKU: PAR-250) - 50 packs
       2. Amul Butter 500g (SKU: AML-500) - 30 packs
       ---------------------------------
       Total Units: 80
       Please confirm delivery date. Thank you!
       ```
  2. **Printable HTML/PDF Order Sheet:**
     * Add a clean `@media print` CSS layout with store header, vendor details, item table, and authorization signature block, triggerable via `window.print()`.

#### Problem 1.5: Dead Stock "Action Required" Dead-End
* **Merchant Problem:** `DeadStockPage.tsx` shows a prominent red banner: *"₹45,000 IMMOBILIZED CAPITAL — ACTION REQUIRED"*, but provides zero buttons or workflows to take action.
* **Code & Schema Root Cause:** `DeadStockPage.tsx` renders stagnation scores and reason codes, but has no mutation handlers or action buttons.
* **The Solution:**
  Add 3 direct action buttons to each Dead Stock item card:
  1. **[🏷️ Create Clearance Discount]:** Opens a quick modal to set a promotional selling price (e.g. 20% off) to liquidate stock before it expires or stagnates.
  2. **[🔄 Return to Supplier (RMA)]:** Directs to a Vendor Return workflow if the supplier has a buyback/credit agreement.
  3. **[🗑️ Mark Write-Off / Discard]:** Allows recording spillage, damage, or obsolescence, deducting stock and logging `reason: "waste_write_off"`.

#### Problem 1.6: Stockout Risks Dead-End
* **Merchant Problem:** `StockoutRisksPage.tsx` shows that milk will run out in 0.8 days, but has no button to reorder right there.
* **Code & Schema Root Cause:** The card only links to the product detail page and displays an AI explain button.
* **The Solution:**
  Add a **[⚡ Reorder Now]** button directly on the risk card. Clicking it opens a pre-filled 1-click PO modal with the supplier and recommended reorder quantity, allowing instantaneous restock without switching pages.

---

### CATEGORY 2: Counter Operations & Retail POS Bottlenecks

#### Problem 2.1: POS Dropdown 100-SKU Cliff
* **Merchant Problem:** Rajesh has 1,200 products. When ringing up a sale in `SalesPage.tsx`, the dropdown only lists the first 100 products (letters A to C). The other 1,100 products cannot be rung up at all!
* **Code & Schema Root Cause:** In `SalesPage.tsx` (lines 473-479), `useProducts` is called with hardcoded `pageSize: 100`, and options are rendered inside a static HTML `<select>`.
* **The Solution:**
  1. Replace the native `<select>` with a **debounced search-as-you-type combobox** (`useProductSearch(query)`).
  2. Searches across `name`, `sku`, and `barcode` against the backend index.
  3. Displays matching items in a dropdown list showing SKU, current stock, and selling price.

#### Problem 2.2: Zero Barcode Scanner Integration at Checkout
* **Merchant Problem:** A retail cashier scans 20 items per minute using a handheld USB barcode scanner. Having to click modals and scroll lists stalls the counter line.
* **Code & Schema Root Cause:** `SalesPage.tsx` has no global keypress buffer or barcode listener hook.
* **The Solution:**
  1. Implement a `useBarcodeScanner` hook:
     * Listens for high-speed sequential keyboard input (keystrokes arriving `<30ms` apart followed by `Enter`).
     * Automatically queries product by `barcode` or `sku`.
     * If found, automatically appends the item to the active sale cart (or increments quantity by 1 if already in cart) and plays an audio confirmation beep.
  2. Cashier workflow becomes: **Scan $\rightarrow$ Scan $\rightarrow$ Scan $\rightarrow$ Press F2 / Enter $\rightarrow$ Complete Sale**.

#### Problem 2.3: Missing Payment Modes & Cash Drawer Reconciliation
* **Merchant Problem:** At 9:30 PM closing time, Rajesh counts physical cash in the drawer. He has no way to verify how much of today's ₹42,000 revenue was collected in Cash vs UPI/GPay vs Card.
* **Code & Schema Root Cause:** `sales` table only stores `id, storeId, saleDate, totalAmount`. It has no `paymentMethod` column.
* **The Solution:**
  1. Add `paymentMethod` to `sales` table (`cash`, `upi`, `card`, `credit`).
  2. In the POS Checkout modal, provide 1-click payment selection buttons: `[💵 Cash]`, `[📱 UPI / QR]`, `[💳 Card]`, `[📒 Store Credit / Khata]`.
  3. On `SalesPage.tsx`, add an **"End of Day Cash Drawer Summary"** widget:
     * Cash in Drawer: ₹14,250
     * Digital / UPI: ₹26,500
     * Card: ₹1,250
     * Total Reconciled: ₹42,000.

#### Problem 2.4: Printable Thermal Receipt / Bill Generation
* **Merchant Problem:** Customers demand a printed bill or WhatsApp receipt for their purchase.
* **Code & Schema Root Cause:** Completed sales simply close the modal with no receipt generation.
* **The Solution:**
  1. Upon confirming a sale, display a "Sale Recorded!" confirmation card with:
     * **[🖨️ Print Thermal Receipt]:** Formats an 80mm thermal receipt (`@media print`) showing Store Name, Tax ID, Date, Items, Total, Payment Mode.
     * **[📱 WhatsApp Bill Link]:** Opens `https://wa.me/{customerPhone}?text={receiptSummary}`.

#### Problem 2.5: No Customer Credit / Khata (Udhaar Ledger)
* **Merchant Problem:** Regular neighbourhood customers take groceries and pay at the end of the month.
* **Code & Schema Root Cause:** Every sale requires immediate full settlement; there is no customer entity or balance tracking.
* **The Solution:**
  1. Create a lightweight `customers` table (`id`, `storeId`, `name`, `phone`, `currentBalance`, `creditLimit`).
  2. When recording a sale with payment mode `credit`, require selecting or entering a customer.
  3. Increments `customer.currentBalance` and logs transaction.
  4. Provides a simple `/customers` ledger view showing who owes what, with a "Send WhatsApp Reminder" button.

---

### CATEGORY 3: Catalog Onboarding & Inventory Ledger Frictions

#### Problem 3.1: The 2,000-Row Unpaginated Inventory Wall
* **Merchant Problem:** Opening `/inventory` with 2,000 SKUs locks up the browser as it attempts to render 2,000 unpaginated rows without a search bar. Finding an item requires manual scrolling.
* **Code & Schema Root Cause:** `InventoryPage.tsx` calls `useInventory()` which returns an unpaginated array with zero search/filter parameters.
* **The Solution:**
  1. Add query params to backend `/api/inventory`: `?search=...&categoryId=...&page=1&pageSize=25&lowStockOnly=true`.
  2. On `InventoryPage.tsx`, add:
     * Search input (debounced by name / SKU).
     * Category filter dropdown.
     * "Show Low Stock Only" toggle.
     * Clean pagination controls (`Showing 1-25 of 1,240 items`).

#### Problem 3.2: 60-Second CSV Catalog Onboarding (Eliminating Setup Cliff)
* **Merchant Problem:** Setting up 1,200 products one-by-one in a modal takes 3 weeks. Retailers give up during onboarding.
* **Code & Schema Root Cause:** The current `/import` page is designed only for **historical sales data**, not for the product catalog.
* **The Solution:**
  1. Add an **"Import Store Catalog via Excel/CSV"** button on `/products`.
  2. Provide a 1-click **Download Starter Template CSV**:
     ```csv
     Name,SKU,Barcode,Category,CostPrice,SellingPrice,InitialStock,SupplierName,SupplierLeadDays
     Parle-G 250g,PAR-250,890123456789,Biscuits,18.00,25.00,100,Parle Distributor,3
     ```
  3. Smart column matcher + validation preview showing duplicate SKUs in red before importing.
  4. Single atomic transaction creates products, categories, suppliers, and sets initial inventory balances.

#### Problem 3.3: Product Registration Disconnect (Missing Initial Stock & Supplier)
* **Merchant Problem:** When Rajesh adds a new physical item on his desk, he has to fill the product modal, save, navigate to `/inventory`, find the item, adjust stock count, and navigate to `/suppliers` to link the vendor.
* **Code & Schema Root Cause:** `ProductFormModal.tsx` only accepts basic product definitions (`name, sku, barcode, costPrice, sellingPrice`).
* **The Solution:**
  1. Add two new fields to `ProductFormModal.tsx`:
     * **Initial Stock on Hand (Units):** Default `0`. If `>0`, the backend automatically initializes `inventory` and creates a movement record (`reason: "initial_stock"`).
     * **Primary Supplier (Dropdown):** Allows selecting an existing supplier or typing a new supplier name.
  2. Adding an item is completed in 15 seconds in a single modal.

#### Problem 3.4: Hidden Supplier Intelligence (Backend Exists, Zero UI)
* **Merchant Problem:** The store owner cannot configure supplier lead times or Minimum Order Quantities (MOQ), so reorder calculations use default values.
* **Code & Schema Root Cause:** `supplier_products` table exists in `schema.ts`, but has zero frontend forms or views.
* **The Solution:**
  1. In `ProductDetailPage.tsx` and `SuppliersPage.tsx`, add a **"Supplier Terms"** card:
     * Lead Time (Days)
     * Minimum Order Quantity (MOQ)
     * Wholesale Purchase Cost
  2. The intelligence service immediately uses these exact parameters in safety stock calculations: $SS = Z \times \sigma_d \times \sqrt{L}$.

#### Problem 3.5: Missing Barcode Generation & Thermal Shelf Label Printing
* **Merchant Problem:** Local bakery items, loose grains, and unpackaged hardware do not have manufacturer barcodes.
* **Code & Schema Root Cause:** No barcode generation utility or printable label templates exist.
* **The Solution:**
  1. In `ProductFormModal.tsx`, add a **[⚡ Generate Barcode]** button that auto-creates an EAN-13 / Code-128 compliant string (e.g. `200000000123`).
  2. Add a **"Print Shelf Labels"** action on the product table: formats a sheet of standard 50mm x 25mm barcode stickers with Product Name, Price, and Barcode for standard thermal printers.

---

### CATEGORY 4: Compliance, Perishables, Security & Roles

#### Problem 4.1: Zero Batch & Expiry Date Tracking (Perishables Blindspot)
* **Merchant Problem:** In grocery, dairy, and pharmacy, goods expire. StockPilot currently only tracks velocity; it cannot warn Rajesh when milk or bread will spoil in 3 days.
* **Code & Schema Root Cause:** No `expiryDate` or `batchNumber` exists on inventory records.
* **The Solution:**
  1. Add optional `expiryDate` and `batchNumber` to purchase order receipts and stock adjustments.
  2. In `StockoutRisksPage` and `DashboardPage`, add an **"Expiry Sentinel"** alert:
     * Lists batches expiring within 7 days.
     * Suggests a 1-click promotional clearance discount to liquidate before total spoilage.

#### Problem 4.2: Missing Role-Based Access Control (Cashier vs. Owner Mode)
* **Merchant Problem:** Rajesh wants to hire a counter clerk to scan sales, but doesn't want the clerk to see store profit margins, supplier wholesale costs, or bank settings.
* **Code & Schema Root Cause:** `users.role` exists in the database, but no middleware or frontend route guards enforce role permissions.
* **The Solution:**
  1. Define two primary roles:
     * **Owner / Manager:** Full access to financial analytics, margins, supplier contracts, settings, and stock overrides.
     * **Cashier:** Restricted to POS checkout (`/sales`), inventory lookups (stock count only, hiding cost prices), and barcode shelf audits.
  2. Hide gross profit and cost figures in Cashier mode.

#### Problem 4.3: Passive Dashboard vs. Operational Morning Cockpit
* **Merchant Problem:** When Rajesh opens StockPilot at 8:30 AM, the dashboard displays 3D graphics and 30-day historical turnover charts, but doesn't answer: *"What must I do right now to keep the store running?"*
* **Code & Schema Root Cause:** `DashboardPage.tsx` focuses exclusively on retrospective analytics.
* **The Solution:**
  Place a **"Morning Command Center"** briefing card at the top of `/dashboard`:
  ```
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ 🌅 TODAY'S STORE BRIEFING — 24 Sept 2026                            [Refresh Digest]   │
  ├──────────────────────────────┬─────────────────────────────┬───────────────────────────┤
  │ ⚠️ 3 Critical Restocks Due   │ 📦 1 Delivery Arriving      │ 📈 Yesterday Summary       │
  │ • Parle-G 250g (6 left)      │ PO-2026-08 from Amul Dairy  │ Revenue: ₹38,420 (42 bills)│
  │ • Tata Salt 1kg (2 left)     │ 40 cartons due by 2:00 PM   │ Top Mover: Fresh Milk 1L  │
  │                              │                             │ Cash Reconciled: ₹14,200  │
  │ [ ⚡ Approve & Send POs ]     │ [ 📥 Mark Received ]        │ [ View Sales Ledger → ]   │
  └──────────────────────────────┴─────────────────────────────┴───────────────────────────┘
  ```

---

## 4. The Ideal 5-Minute Daily Routine (The Target Merchant Experience)

With these 20 solutions implemented, Rajesh's day becomes effortless:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   THE 5-MINUTE DAILY AUTOPILOT ROUTINE                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  08:30 AM  Open Dashboard ➔ Review Morning Briefing Card (30 seconds)            │
│            • See 2 critical stockout items.                                      │
│            • Click "Approve & Send via WhatsApp" ➔ Distributor confirms order.   │
│                                                                                  │
│  09:00 AM  Cashier opens POS Counter (/sales).                                   │
│            • Scans items all day with USB barcode scanner.                       │
│            • Cash / UPI payments recorded with 1 click.                          │
│            • Stock auto-decrements in PostgreSQL atomically.                     │
│                                                                                  │
│  02:15 PM  Distributor truck arrives.                                            │
│            • Open `/purchase-orders` ➔ Click "Receive Delivery" (1 click).       │
│            • Stock immediately increments across all delivered SKUs.             │
│                                                                                  │
│  09:30 PM  Closing time.                                                         │
│            • Check Cash Drawer Reconciliation: Drawer cash matches system logs.  │
│            • Close laptop. Zero spreadsheets. Zero manual data entry.            │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap

### Milestone 1: Close the Core Operational Loop (Procurement & Orders) — *Immediate Priority*
1. **Reorder-to-PO Automation:**
   * Wire `updateRecommendationStatus` to auto-insert a real row into `purchase_orders`.
2. **Purchase Orders UI:**
   * Build `apps/frontend/src/pages/PurchaseOrdersPage.tsx` with tabs (`Pending`, `Received`).
   * Add 1-click **"Receive PO"** button (increments stock atomically) and **"Cancel PO"** button.
   * Add `/purchase-orders` route to `routes.tsx` and sidebar navigation.
3. **Supplier Last-Mile Dispatch:**
   * Add 1-click **"Share to WhatsApp"** button (`wa.me` deep link with pre-formatted PO list).
   * Add **"Print Order Sheet"** layout for suppliers.
4. **Actionable Alerts:**
   * Add **[Reorder Now]** button on `StockoutRisksPage.tsx`.
   * Add **[Clearance Discount]** and **[Return to Supplier]** buttons on `DeadStockPage.tsx`.

### Milestone 2: High-Speed Counter POS & Real Retail Billing
1. **Kill the 100-SKU Cliff:** Replace static select with debounced search combobox on `SalesPage.tsx`.
2. **Barcode Scanner Hook:** Implement `useBarcodeScanner` for rapid USB scanning without modal clicks.
3. **Payment Modes:** Add `cash`, `upi`, `card`, `credit` selection to POS checkout.
4. **Receipt Generation:** Thermal receipt print stylesheet (`@media print`) and WhatsApp digital bill.
5. **Cash Drawer Reconciliation:** Daily summary card comparing cash vs digital collections.

### Milestone 3: 5-Minute Routine & Frictionless Catalog Setup
1. **Morning Command Center:** Add the 3-item daily briefing widget to `DashboardPage.tsx`.
2. **All-in-One Product Modal:** Add "Initial Stock" and "Supplier" fields directly into `ProductFormModal.tsx`.
3. **Frictionless Inventory Ledger:** Add search bar, category filter, and 25-row pagination to `InventoryPage.tsx`.
4. **CSV Catalog Onboarding:** Build bulk catalog CSV import with downloadable sample template on `/products`.

### Milestone 4: Compliance, Roles & Perishables
1. **Perishables & Expiry Sentinel:** Track batch/expiry dates on PO receipts with 7-day expiration alerts.
2. **Customer Khata (Store Credit):** Track accounts receivable for neighborhood customers.
3. **Role Gating:** Cashier mode restricting sensitive profit margins and catalog deletions.

---

## 6. How to Pitch This Architecture (Resume & Investor Framing)

When presenting StockPilot to technical interviewers, investors, or SaaS customers:

> *"Most retail inventory apps fail because they act as passive databases requiring hours of manual spreadsheet data entry. I re-architected StockPilot around an autonomous, closed-loop operating model:*
> 1. *Counter sales atomically decrement inventory via real-time transactional barcode scanning.*
> 2. *Replenishment is driven by deterministic safety stock algorithms ($Z \times \sigma_d \times \sqrt{L}$) rather than guesswork.*
> 3. *Decision-to-dispatch is compressed into 1 click via automated WhatsApp PO generation.*
> 4. *A consolidated Morning Command Center eliminates 15-tab navigation fatigue, allowing a merchant to run their entire inventory in under 5 minutes a day."*
