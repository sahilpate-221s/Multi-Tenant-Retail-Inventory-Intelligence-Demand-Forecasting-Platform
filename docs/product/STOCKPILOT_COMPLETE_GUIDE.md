# StockPilot — Complete Product Guide & Testing Handbook

**Last Updated:** September 25, 2026  
**App:** http://localhost:5173 (Frontend) — http://localhost:4000 (Backend API)

---

## What Is StockPilot?

StockPilot is an **AI-powered retail inventory management platform** for small and medium shop owners. Think of it as the brain that runs your entire store: it tracks every product on your shelf, tells you when to reorder, lets your cashier ring up sales with a barcode scanner, warns you about expiring goods, and even manages who owes you money (and who you owe money to).

**The core idea:** A shopkeeper should spend 5 minutes per day on stock management, not 2 hours. StockPilot automates the tedious parts so you can focus on serving customers.

---

## The Sidebar Navigation (Your Map)

When you log in, the left sidebar has 4 sections. Here's what each page does and how to test it.

---

## SECTION 1: CORE (The Foundation)

### 📊 Dashboard (`/dashboard`)
**What it does:** Your store's homepage. Shows revenue trends, top-selling items, and a **Morning Briefing Card** at the top.

**The Morning Briefing Card answers:** *"What do I need to deal with RIGHT NOW?"*
- 🔴 Critical stockouts (items about to run out)
- 📦 Deliveries arriving today
- ⚠️ Perishable items expiring within 7 days
- 📈 Yesterday's sales summary

**How to test:**
1. Go to `/dashboard` after logging in.
2. The Morning Briefing Card should appear at the top.
3. It automatically pulls real data — if you have products with low stock, they'll show up here.
4. The revenue charts and analytics below show your historical performance.

---

### 📦 Products (`/products`)
**What it does:** Your complete product catalog. Every item you sell lives here.

**Key actions:**
- **+ Add Product** → Opens a modal where you fill in name, SKU, cost price, selling price.
  - You can also set **Initial Stock on Hand** (so you don't have to go to Inventory separately).
  - You can assign a **Primary Supplier** right from here.
  - Click **⚡ Generate Barcode** if the item doesn't have one (loose goods, bakery items, etc.).
- **🏷️ Print Shelf Labels** → Prints 50mm x 25mm barcode sticker sheets for your thermal printer.
- **📥 Download Catalog CSV** → Exports your product list.

**How to test:**
1. Go to `/products`.
2. Click **+ Add Product** → Fill in: Name: "Test Product", SKU: "TEST-001", Cost: 50, Selling: 80, Initial Stock: 25.
3. Click **⚡ Generate Barcode** to auto-create one.
4. Save it. It should appear in the product list AND in your inventory with 25 units.
5. Click on a product name → Opens its **Detail Page** with full info, supplier card, and single-label print button.

---

### 📋 Inventory (`/inventory`)
**What it does:** Shows every product's **current shelf stock** in real-time. This is your live stock count.

**Key features:**
- **Search bar** → Find any item by name or SKU instantly.
- **Category filter dropdown** → Show only "Dairy" or "Snacks" etc.
- **Low Stock toggle** → Show only items running low.
- **Adjust Stock** → Click the ⚙️ icon on any row to manually add/remove stock (with a reason: restock, damage, correction, etc.).
- **📥 Export CSV** → Download current inventory snapshot.
- **🎯 Aisle Audit** button → Opens the barcode cycle count scanner (more on this below).
- **⚠️ At-Risk Cockpit** button → Opens the risk dashboard.

**How to test:**
1. Go to `/inventory`.
2. You should see products with stock counts. Use the search bar to find a specific item.
3. Click the ⚙️ adjust button on any row → Try adding +5 with reason "restock".
4. Confirm the stock count updated.
5. Toggle "Low Stock" → Only items below their minimum threshold should show.

---

### 🏪 Suppliers (`/suppliers`)
**What it does:** Your vendor/distributor directory. Everyone you buy stock from.

**Key features:**
- Add suppliers with name, phone, email.
- Each supplier card shows **lead time** (how many days they take to deliver), **MOQ** (minimum order quantity), and a **WhatsApp** deep link for instant messaging.
- Click a supplier → See which products you buy from them.

**How to test:**
1. Go to `/suppliers`.
2. Click **+ Add Supplier** → Name: "Amul Dairy", Phone: "9876543210", Lead Time: 3 days.
3. The supplier should appear with a WhatsApp icon you can click.

---

## SECTION 2: OPERATIONS (Daily Store Activities)

### 🛒 Sales (`/sales`)
**What it does:** This is your **Point of Sale (POS) cash register**. Use this to record every customer transaction.

**Key features:**
- **Record Sale** button → Opens the POS modal.
- **High-Speed Barcode Scanner** → Type or scan a barcode/SKU in the top input. Press Enter. The item gets added to the cart instantly with an audio "beep" confirmation.
- **Product Search Combobox** → Search any product by name across your entire catalog (no more 100-item limit).
- **Payment Methods** → Choose Cash, UPI, Card, or Udhaar (store credit). If "Cash", enter the amount tendered and it calculates change.
- **If Udhaar** → You're asked to enter the customer's name/phone. Their balance gets tracked in Customer Khata.
- **After sale completes** → You get a receipt with 🖨️ Print (thermal 80mm receipt) and 📱 WhatsApp share options.
- **Cash Drawer Register Bar** → The bottom bar shows how much Cash, UPI, and Card you've collected today (for end-of-shift reconciliation).

**How to test:**
1. Go to `/sales` → Click **Record Sale**.
2. In the barcode scanner input, type a product SKU and press Enter → It should beep and add to cart.
3. Add 2-3 items. Change quantities.
4. Select **💵 Cash** as payment, enter tendered amount → Change should calculate.
5. Click Submit. The receipt should show with print & WhatsApp options.
6. The register bar at the bottom should now show today's totals.
7. Check `/inventory` — the stock for the sold items should have decreased.

---

### 📒 Customer Khata (`/khata`)
**What it does:** Tracks money **customers owe YOU** (Udhaar / store credit). In India, 40%+ of neighbourhood retail runs on informal credit — "I'll pay at month end."

**Key features:**
- **Add Customer** → Name, phone number, optional credit limit.
- **Record Credit Sale** → Add an outstanding amount for a customer.
- **Record Payment** → When they come back and pay ₹500 off their balance.
- **WhatsApp Reminder** → 1-click sends a pre-filled WhatsApp message: "Hi [Name], your outstanding balance is ₹2,400. Please pay via UPI: [your UPI ID]".
- **Dashboard cards** → Total outstanding, active borrowers, overdue accounts.

**How to test:**
1. Go to `/khata`.
2. Click **+ Add Customer** → Name: "Rahul", Phone: "9999999999".
3. Click on Rahul → **+ New Credit** → Amount: ₹500, Note: "Groceries".
4. His balance should now show ₹500.
5. Click **Record Payment** → Pay ₹200 cash → Balance drops to ₹300.
6. Click **WhatsApp Reminder** → A `wa.me` link should open with pre-filled text.

---

### 💰 Vendor Khata (`/vendor-khata`)
**What it does:** The reverse of Customer Khata — tracks money **YOU owe to YOUR suppliers**. Answers: *"How much do I owe Amul Dairy this Friday?"*

**Key features:**
- **Add Vendor** → Name, phone, credit terms (30-day credit, ₹50,000 limit, payment day = Friday).
- **Record Invoice** → When a supplier delivers goods and gives you a bill.
- **Record Payment** → When you pay the supplier (Cash, UPI, NEFT, Cheque).
- **Credit Notes** → If the supplier gives you a return credit.
- **Overdue Detection** → Vendors past their credit term turn red.
- **Credit Utilization** → Visual progress bar showing how much of your credit limit you've used.
- **WhatsApp Payment Notification** → Send supplier a message confirming payment.
- **CSV Export** → Download the full payment ledger.

**How to test:**
1. Go to `/vendor-khata`.
2. Click **+ Add Vendor** → Name: "Amul Dairy", Phone: "9876543210", Credit Period: 30 days, Credit Limit: ₹50,000.
3. Click on the vendor → **+ Record Invoice** → Invoice #: "INV-001", Amount: ₹12,000.
4. Outstanding should be ₹12,000. Credit utilization bar should fill to ~24%.
5. **+ Record Payment** → ₹5,000 via UPI → Outstanding drops to ₹7,000.
6. Try exporting the CSV.

---

### 📋 Purchase Orders (`/purchase-orders`)
**What it does:** Tracks what you've ordered from suppliers and when it should arrive. Manages the full procurement cycle.

**Key features:**
- **Tab filters:** All, Pending, Received, Cancelled.
- **Draft PO** → Create a new order for a supplier + product + quantity.
- **Mark Received** → When the truck arrives, click this. Stock **automatically increases** in your inventory.
- **Cancel** → Cancel an order you no longer need.
- **WhatsApp Dispatch** → Send the order to the supplier via WhatsApp with a pre-formatted message.
- **Print Order Slip** → Clean printable purchase order for physical filing.
- **Batch/Expiry capture** → When receiving perishable deliveries, you can enter batch numbers and expiry dates.

**How to test:**
1. Go to `/purchase-orders`.
2. Click **+ Draft PO** → Select a supplier, product, quantity: 50.
3. The PO appears in "Pending" tab.
4. Click **📱 WhatsApp** → A wa.me link opens with a formatted order.
5. Click **✅ Receive Delivery** → Check `/inventory` — the product stock should have gone up by 50.
6. The PO moves to "Received" tab.

---

### 🎯 Aisle Cycle Audit (`/inventory/audit`)
**What it does:** **Shrinkage detection engine.** Walk through your store with a USB barcode scanner. Scan every item on the shelf. The system compares what you scanned (physical count) vs what the computer thinks you have (system count) and finds the differences.

**Why it matters:** Retailers lose 1-3% of revenue to theft, damage, and counting mistakes. This page finds those losses.

**Key features:**
- **Barcode Scanner Listener** → Scan items continuously. Each scan increments the physical count for that item.
- **Multiplier Pills** (+1, +5, +10, +12) → If you're counting 10 packs of something, set multiplier to +10 and scan once.
- **Focus Lock** → Keeps the cursor in the scanner input so you never lose focus.
- **Audio Feedback** → Pleasant chime for successful scan, buzz for unknown barcode.
- **Live Variance Table** → Shows System Stock vs Physical Count, and the difference (positive = surplus, negative = shortage/theft).
- **Capital Impact** → Calculates the ₹ value of shortages and surpluses.
- **Reason Classification** → For each discrepancy, select a reason: Theft, Damage, Clerical Error, Supplier Shortage, or Found Stock.
- **⚡ Reconcile Variances** → Commits all corrections to the database in one batch. The system stock gets adjusted to match your physical count.
- **📥 Export Audit CSV** → Download the full audit report.
- **Session Persistence** → If you close the browser mid-audit, your counts are saved and resume where you left off.

**How to test:**
1. Go to `/inventory/audit`.
2. In the scanner input, type a product SKU and press Enter → You should hear a chime. The item appears in the table with Physical Count = 1.
3. Type the same SKU again → Count becomes 2.
4. Use the +/- buttons in the table to manually adjust counts.
5. Click **Match System** on any row to set its physical count equal to the system count (marks as verified).
6. If there's a variance, select a reason from the dropdown (e.g., "Theft / Pilferage").
7. Click **⚡ Reconcile Variances** → A confirmation modal shows the net impact. Confirm → Watch the progress bar.
8. Go back to `/inventory` — the stock should now match your physical counts.

---

### 📥 Import (`/import`)
**What it does:** Bulk upload historical sales data via CSV files.

**Key features:**
- Upload CSV → System validates, previews, and imports in the background.
- Download sample CSV template to see the format.
- View import history and errors.

**How to test:**
1. Go to `/import` → Click **Download Sample CSV** to get the template.
2. Fill it with some data, upload it.
3. The system processes it in the background (via Redis queue).
4. Click on the import record to see row-by-row results.

---

### 📦 Bulk Restock (`/inventory/bulk-restock`)
**What it does:** Upload a CSV to restock multiple items at once, instead of adjusting one by one.

**Key features:**
- Download sample CSVs (by Product Name or by SKU).
- Upload → Preview which items will be restocked and by how much.
- Commit → All stock adjustments happen in one database transaction.

**How to test:**
1. Go to `/inventory/bulk-restock`.
2. Download the sample CSV. Fill in some product names/SKUs and quantities.
3. Upload → Preview shows what will change.
4. Click Commit → Stock levels update.

---

## SECTION 3: INTELLIGENCE (Smart Insights & Alerts)

### ⚠️ At-Risk Sentinel (`/inventory/at-risk`)
**What it does:** A **unified risk dashboard** showing all threatened inventory in one place.

**4 risk pillars:**
1. 🔴 **Imminent Stockouts** — Items that will run out within days.
2. ⏰ **Expiring Batches** — Perishables about to expire.
3. 💀 **Dead Capital** — Items sitting on shelves for months with zero sales.
4. 📊 **Total Threat Count** — Overall count of at-risk items.

**Quick actions from this page:** Draft PO, Go to POS (to push clearance), Create Discount, Download At-Risk Audit CSV.

**How to test:**
1. Go to `/inventory/at-risk`.
2. If you have items with low stock, they'll appear in the Stockout section.
3. If you recorded batch expiry dates during PO receiving, expiring items show here.
4. Dead stock items (products with inventory but zero recent sales velocity) appear with capital immobilized.

---

### 📈 Forecasts (`/forecasts`)
**What it does:** AI-generated demand predictions for your products. Shows how many units you'll likely sell in the next 7, 14, and 30 days.

**How to test:**
1. Go to `/forecasts` → Shows forecast runs.
2. Click on a product forecast → See the prediction chart, confidence intervals, and recommended reorder quantities.

---

### 🚨 Stockout Risk (`/stockout-risks`)
**What it does:** Lists products that are in danger of running out, ranked by urgency.

**Key actions:**
- **⚡ Reorder Now** → Opens a pre-filled PO drafting modal with the supplier and recommended quantity.
- **View Product** → Jump to the product detail page.

**How to test:**
1. Go to `/stockout-risks`.
2. If any product has high velocity and low stock, it'll appear as "CRITICAL" or "HIGH".
3. Click **⚡ Reorder Now** → A PO should get drafted automatically.

---

### 📋 Reorder Recommendations (`/reorder-recommendations`)
**What it does:** Smart suggestions for what to reorder, based on demand velocity, lead times, and safety stock math.

**Key action:** Clicking **"Mark Ordered"** on a recommendation automatically creates a real Purchase Order.

**How to test:**
1. Go to `/reorder-recommendations`.
2. If recommendations exist, click **"Mark Ordered"** on one.
3. Go to `/purchase-orders` → The PO should now appear as "Pending".

---

### 💀 Dead Stock (`/dead-stock`)
**What it does:** Finds products that are sitting unsold, tying up your cash.

**Key actions:**
- **🏷️ Markdown Discount** → Create a clearance sale.
- **🗑️ Liquidation Write-Down** → Write off damaged/obsolete goods and remove from inventory.
- Shows **capital immobilized** (how much money is stuck in dead products).

**How to test:**
1. Go to `/dead-stock`.
2. Items with high inventory but zero or very low sales velocity appear here.
3. Try clicking **🗑️ Write-Down** on one → Confirm → Stock should decrease.

---

### 📉 Anomalies (`/anomalies`)
**What it does:** Detects unusual demand spikes or drops that deviate from normal patterns. Helps you spot sudden surges (maybe a competitor closed) or drops (maybe product quality issue).

**How to test:**
1. Go to `/anomalies` → View any detected unusual demand patterns.

---

### 🧪 Simulator (`/simulator`)
**What it does:** "What-if" sandbox. Model scenarios before they happen:
- *"What if I run a 20% discount promotion?"*
- *"What if my supplier delays by 5 days?"*
- *"What if demand doubles next week?"*

Shows projected stock levels and revenue impact.

**How to test:**
1. Go to `/simulator`.
2. Select a product and modify parameters (demand, discount, delay).
3. Run the simulation → See projected outcomes.

---

## SECTION 4: SYSTEM

### 🤖 AI Assistant (`/ai-assistant`)
**What it does:** Natural language chatbot that can answer questions about your store data.

**Example questions you can ask:**
- *"What are my top 5 selling products?"*
- *"Which items are running low?"*
- *"How much inventory value do I have?"*

**How to test:**
1. Go to `/ai-assistant`.
2. Type a question like "What products are low on stock?" → It queries your real database and responds.

---

### 🔔 Notifications (`/notifications`)
**What it does:** Your operations command stream. Every important system event shows up here with **action buttons** so you can act immediately.

**Notification types and their actions:**
| Notification Type | What It Means | Quick Actions Available |
|:---|:---|:---|
| STOCKOUT_RISK | A product is running out | ⚡ View Risks, 🔄 Reorder Now, 📦 View Product |
| LOW_STOCK | Stock is below minimum threshold | ⚡ Reorder, 📋 Inventory Ledger |
| DEAD_STOCK | Item is stagnating on shelf | 🏷️ Markdown, 🗑️ Liquidate |
| REORDER_RECOMMENDATION | System suggests reordering | 📋 Draft PO |
| FORECAST_READY | New demand forecast available | 📈 View Forecast |
| IMPORT_COMPLETED | CSV import finished | 📥 View Import |
| IMPORT_FAILED | CSV import had errors | 📥 View Errors |

**The Notification Bell** (🔔 in the top navbar) also shows a dropdown with quick actions for the latest notifications without leaving your current page.

**How to test:**
1. Go to `/notifications`.
2. Filter by type using the pills at the top.
3. Toggle "Unread Only" to see only new notifications.
4. Click any action button → It should navigate you to the relevant page.
5. Click the 🔔 bell in the top-right → A dropdown should show recent notifications with action buttons.

---

### ⚙️ Settings (`/settings`)
**What it does:** Store configuration — store name, API keys, preferences.

**How to test:**
1. Go to `/settings` → View and update your store details.

---

## SPECIAL FEATURES (Not in the sidebar, but important)

### 🔐 Cashier Mode (Role-Based Access)
**What it does:** If you have a counter clerk, switch to **Cashier Mode** so they can only access the POS, Customer Khata, Inventory lookup, and Notifications. They **cannot** see profit margins, supplier costs, or settings.

**How to test:**
1. In the sidebar, find the **Cashier Mode toggle**.
2. Enable it → The sidebar should shrink to just: Sales, Customer Khata, Inventory, Notifications.
3. To exit Cashier Mode → Click the toggle again → Enter PIN: **1234**.
4. Full navigation should restore.

---

### 🍞 Perishable & Expiry Tracking
**What it does:** When you receive deliveries of dairy, bread, or any perishable item, the system captures **batch number** and **expiry date**. It then:
- Shows warnings on the Morning Briefing Card for items expiring within 7 days.
- Flags expiring batches in the Inventory page.
- Includes them in the At-Risk Sentinel.

**How to test:**
1. Go to `/purchase-orders` → Click **Receive Delivery** on a pending PO.
2. In the receive modal, enter a batch number and expiry date.
3. Go to `/dashboard` → If the expiry is within 7 days, it should appear in the Morning Briefing.
4. Go to `/inventory` → The item should have an expiry badge.

---

### 🏷️ Barcode Generation & Shelf Sticker Printing
**What it does:** For items that don't have manufacturer barcodes (loose grains, bakery items, local products), StockPilot auto-generates barcodes. You can then print 50x25mm shelf stickers on a thermal printer.

**How to test:**
1. Go to `/products` → **+ Add Product** → Click **⚡ Generate Barcode**.
2. Save the product.
3. Go to `/products` → Click **🏷️ Print Shelf Labels** → A print-optimized layout appears with store name, price, and barcode per label.
4. On any product detail page → Click **Print Single Label** for one product.

---

## Quick Reference: Page URL Map

| Page | URL | Purpose |
|:---|:---|:---|
| Landing | `/` | Marketing landing page |
| Login/Register | `/login`, `/register` | Authentication |
| Dashboard | `/dashboard` | Morning briefing + analytics |
| Products | `/products` | Product catalog CRUD |
| Product Detail | `/products/:id` | Single product view + labels |
| Inventory | `/inventory` | Real-time shelf stock ledger |
| Aisle Audit | `/inventory/audit` | Barcode cycle count scanner |
| Bulk Restock | `/inventory/bulk-restock` | CSV bulk stock adjustment |
| At-Risk Sentinel | `/inventory/at-risk` | Unified risk dashboard |
| Suppliers | `/suppliers` | Vendor directory |
| Sales (POS) | `/sales` | Point of Sale counter |
| Customer Khata | `/khata` | Customer credit ledger (money owed TO you) |
| Vendor Khata | `/vendor-khata` | Supplier credit ledger (money YOU owe) |
| Purchase Orders | `/purchase-orders` | Procurement tracking |
| Import | `/import` | CSV sales data import |
| Forecasts | `/forecasts` | AI demand predictions |
| Stockout Risks | `/stockout-risks` | Stockout urgency alerts |
| Reorder Recs | `/reorder-recommendations` | Smart reorder suggestions |
| Dead Stock | `/dead-stock` | Stagnant inventory detection |
| Anomalies | `/anomalies` | Unusual demand detection |
| Simulator | `/simulator` | What-if scenario sandbox |
| AI Assistant | `/ai-assistant` | Natural language data Q&A |
| Notifications | `/notifications` | Actionable operations stream |
| Settings | `/settings` | Store configuration |

---

## How Everything Connects (The Big Picture Flow)

```
1. ADD PRODUCTS (/products)
   └── Sets up your catalog with initial stock, barcode, supplier
         │
2. SELL TO CUSTOMERS (/sales)
   ├── Scan barcode → adds to cart → checkout
   ├── Stock automatically decreases
   ├── If paid on credit → goes to Customer Khata (/khata)
   └── Cash register bar tracks Cash/UPI/Card totals
         │
3. SYSTEM WATCHES YOUR STOCK (automatic)
   ├── Stockout Risks → warns you when items run low
   ├── Reorder Recommendations → tells you what to reorder
   ├── Dead Stock → flags what's not selling
   └── Notifications → alerts you in real-time
         │
4. REORDER FROM SUPPLIERS (/purchase-orders)
   ├── Draft PO manually, or accept a reorder recommendation
   ├── Send to supplier via WhatsApp
   ├── When delivery arrives → Mark Received → stock goes UP
   └── Record supplier invoice → Vendor Khata (/vendor-khata)
         │
5. AUDIT YOUR STORE (/inventory/audit)
   ├── Walk aisles with barcode scanner
   ├── Compare physical vs system counts
   ├── Find theft, damage, counting errors
   └── Reconcile → fix all stock levels in 1 click
         │
6. REVIEW DAILY (/dashboard)
   └── Morning Briefing Card answers:
       "What needs my attention RIGHT NOW?"
```

---

## Running the App Locally

**Prerequisites:** Docker (for PostgreSQL + Redis), Node.js

```bash
# Start databases (from project root)
docker compose up -d

# Start backend (terminal 1)
cd apps/backend
npm run dev      # Runs on http://localhost:4000

# Start frontend (terminal 2)
cd apps/frontend
npm run dev      # Runs on http://localhost:5173
```

**Default login:** Register a new account at `/register`, then log in.  
**Cashier PIN:** `1234` (to exit cashier mode).

---

## Test Suites

```bash
# Backend tests (107 tests across 26 suites)
cd apps/backend
npm test

# ML service tests (24 tests)
cd apps/ml
pytest
```

**All 131 automated tests pass.** Frontend build compiles with 0 TypeScript errors.
