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

### 1.1. Role-Based Permissions (Cashier vs Manager vs Owner) — 🔴 P0 (Critical)
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

### 1.3. Returns, Refunds & Item Exchange Flow — 🔴 P0 (Critical)
* **Abhi Kya Hai:** Grahak saaman le gaya toh bas sale record ho gayi. Agar 2 ghante baad grahak bole *"Bhaiya 1 packet soap wapas lena hai aur badle mein shampoo dena hai"*, toh system mein direct Return/Exchange ka button nahi hai.
* **Asli Dukan ki Problem:**
  * Retail mein 10% log saaman badalwane aate hain.
  * Agar return system mein nahi chadhega, toh:
    1. Inventory stock galat ho jayega (wapas aaya soap stock mein count nahi hoga).
    2. Galle ka cash mismatch ho jayega.
* **Kya Chahiye:**
  * POS screen par "Return / Exchange" button jahan purana Invoice No daalo, items select karo, aur refund cash do ya doosre item ke against adjust karo.

---

### 1.4. Indian GST / Tax Slabs Compliance — 🟡 P1 (Important)
* **Abhi Kya Hai:** Discount flat % par hai, aur tax generic hai.
* **Asli Dukan ki Problem:**
  * India mein har item par alag GST slab hota hai:
    * Doodh, Atta, Dal = 0% (Nil GST)
    * Ghee, Butter = 5% ya 12%
    * Biscuits, Chocolates = 18%
    * Soft drinks = 28%
  * Bill par legal GST invoice ke liye **HSN Code**, **CGST** aur **SGST** ka alag-alag hisaab dikhna zaroori hota hai agar dukan registered hai.
* **Kya Chahiye:**
  * Product setup mein GST Slab dropdown (0%, 5%, 12%, 18%, 28%) aur HSN code input, aur receipt par tax summary table.

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

### 2.1. Stock Deduction Concurrency & Race Conditions (Critical DB Flaw) — 🔴 P0
* **Current Code Situation:**
  Jab POS par sale banti hai, code karta hai:
  1. `db.query.inventory.findFirst(...)` -> current stock padhta hai (e.g., 5 bacha hai).
  2. Code mein minus karta hai `5 - 1 = 4`.
  3. `db.update(inventory).set({ currentStock: 4 })` likhta hai.
* **The Vulnerability (Race Condition):**
  * Agar dukan par **2 billing counter** chal rahe hain ya 2 cashier ek hi samay (millisecond) par aakhri packet bechte hain, toh dono counter 5 padhenge aur dono 4 update kar denge!
  * Asli stock 3 ho gaya lekin DB mein 4 reh gaya. Ya stock negative chala jayega!
* **How to Fix (Atomic DB Update):**
  SQL atomic update use karein:
  ```sql
  UPDATE inventory 
  SET current_stock = current_stock - $1 
  WHERE product_id = $2 AND store_id = $3 AND current_stock >= $1;
  ```
  Agar affected rows `0` aati hain, toh error throw karein: *"Stock out! Item kisi aur counter par bik gaya."*

---

### 2.2. Soft Deletes vs Hard Deletes (Data Integrity & Foreign Keys) — 🔴 P0
* **Current Code Situation:**
  Agar koi product ya supplier delete karta hai, toh DB se row delete (`DELETE FROM products WHERE id = ...`) ho sakti hai.
* **The Vulnerability:**
  * Purane sales history mein us product ki sale darj hai. Agar product table se gayab ho gaya, toh sales analytics report crash ho sakti hai ya orphan records ban jayenge.
* **How to Fix:**
  * Har table mein `deleted_at: timestamp` column add karein.
  * Delete API sirf `deleted_at = now()` karega (Soft Delete), data hamesha report ke liye zinda rahega.

---

### 2.3. Background Job Queue (BullMQ + Redis) Reliability — 🟡 P1
* **Current Situation:**
  AI forecasts aur stockout risk calculations BullMQ par queue hote hain.
* **The Vulnerability:**
  * Agar Redis restart ho jaye ya connection drop ho, toh pending jobs fail ho sakte hain.
  * Dead Letter Queue (DLQ) aur alerting system missing hai agar koi calculation 3 baar fail ho jaye.
* **How to Fix:**
  * BullMQ mein exponential backoff retry configure karein (`attempts: 5, backoff: { type: 'exponential', delay: 2000 }`).
  * Failed job monitoring dashboard (jaise Bull-Board) integrate karein.

---

### 2.4. Row Level Security & Multi-Tenant Isolation — 🟡 P1
* **Current Situation:**
  Har query mein developer haath se likhta hai `where: eq(table.storeId, req.auth.storeId)`.
* **The Vulnerability:**
  * Agar kisi developer ne naya endpoint banaya aur galti se `storeId` filter lagana bhool gaya, toh Store A ka data Store B ko leak ho sakta hai!
* **How to Fix:**
  * PostgreSQL ki native **Row Level Security (RLS)** enable karein:
    ```sql
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY store_isolation_policy ON products 
    USING (store_id = current_setting('app.current_store_id'));
    ```

---

### 2.5. Automated Testing & CI/CD Pipeline — 🟡 P1
* **Current Situation:**
  Frontend mein component unit tests aur POS billing ka automated end-to-end (E2E) test nahi hai.
* **The Vulnerability:**
  * Kisi din POS code mein choti si CSS ya button change ki wajah se billing fail ho sakti hai aur bina testing ke pata nahi chalega.
* **How to Fix:**
  * Playwright E2E test setup karein jo checkout flow test kare:
    1. Scan barcode -> 2. Item cart mein aaya -> 3. Cash tender dala -> 4. Sale successful -> 5. Stock -1 hua.

---

### 2.6. Centralized Logging & Error Telemetry — 🟢 P2
* **Current Situation:**
  `console.error` aur basic Pino logger use ho raha hai jo terminal mein print hota hai.
* **How to Fix:**
  * Sentry ya OpenTelemetry integrate karein taaki counter par jab bhi kisi cashier ka scan fail ho ya network timeout ho, developer ke paas instant alert aa jaye with stack trace.

---

# 3. Prioritized Roadmap: Pehle Kya Theek Karein

| Priority | Feature / Gap | Perspective | Effort | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **P0 (Immediate)** | **Atomic Stock Decrement (Concurrency)** | Developer | 2 Hours | Stock kabhi negative nahi hoga, data 100% accurate |
| **P0 (Immediate)** | **Cashier vs Owner Role (RBAC)** | User & Dev | 4 Hours | Cashier profit margin ya settings nahi dekh sakega |
| **P0 (Immediate)** | **Raw Thermal Print (ESC/POS)** | User | 3 Hours | 1-second silent bill printing at counter |
| **P1 (Next)** | **Return & Exchange on POS** | User | 5 Hours | Wapas aane wale saaman ka hisaab aur stock wapas judna |
| **P1 (Next)** | **Indian GST Slabs & HSN Codes** | User | 4 Hours | Tax compliance aur legal tax invoice |
| **P1 (Next)** | **Offline PWA Sync (IndexedDB)** | User & Dev | 8 Hours | Net band hone par bhi dukaan nahi rukegi |
| **P2 (Later)** | **WhatsApp Bill Sharing** | User | 3 Hours | Paper bachaega, customer delight |
| **P2 (Later)** | **Playwright E2E Testing** | Developer | 4 Hours | Production stability guarantee |
