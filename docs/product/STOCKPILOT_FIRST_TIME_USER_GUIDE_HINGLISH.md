# StockPilot — First-Time User Complete Handbook (Hinglish Guide)
*Ek Retail Business Owner / Shopkeeper ke Nazariye se Step-by-Step Practical Guide*

---

## 📌 Yeh Document Kiske Liye Hai?

Agar aapne StockPilot pehli baar open kiya hai aur screen pe itne saare buttons, tables, alerts aur charts dekh kar confuse ya overwhelm ho rahe hain — toh **yeh guide aapke liye hai**. 

Yahan hum koi technical jargon ya developer ki bhasha use nahi karenge. Hum baat karenge ek **asli dukaandar (shopkeeper/store manager)** ke nazariye se:
* Kaunsi screen kis kaam aati hai?
* Yeh aapka roz ka 2 se 3 ghanta kaise bacha sakti hai?
* Aapko computer mein **haath se (manually)** kya daalna padega?
* System **khud-ba-khud (automatically)** kya sambhal lega?
* Aur sabse zaroori: **Is software mein abhi kya kamiyaan (gaps) hain jahan aapko savdhaan rehna padega?**

---

# 📑 Table of Contents

1. [Dukaan ki Kahani: Pehle vs StockPilot ke Baad](#1-dukaan-ki-kahani-pehle-vs-stockpilot-ke-baad)
2. [Day 1: Dukaan ki Shuruat (Initial Setup)](#2-day-1-dukaan-ki-shuruat-initial-setup)
3. [Rozana Ka Kaam: Billing Counter (POS Walkthrough)](#3-rozana-ka-kaam-billing-counter-pos-walkthrough)
4. [Maal Mangwana: Suppliers & Purchase Orders](#4-maal-mangwana-suppliers--purchase-orders)
5. [Expiry Aur Kharabi se Bachav: Perishables & Batches](#5-expiry-aur-kharabi-se-bachav-perishables--batches)
6. [Chori Aur Galti Pakadna: Stock Audits & Physical Counting](#6-chori-aur-galti-pakadna-stock-audits--physical-counting)
7. [Grahak Sambhalna: Customers & Udhaar (Khata)](#7-grahak-sambhalna-customers--udhaar-khata)
8. [Raat ka Hisaab-Kitaab: Analytics & AI Assistant](#8-raat-ka-hisaab-kitaab-analytics--ai-assistant)
9. [Clear Comparison: Manually Kya Karna Hai vs System Khud Kya Karega](#9-clear-comparison-manually-kya-karna-hai-vs-system-khud-kya-karega)
10. [Honest Reality Check: System ke Gaps & Friction Points](#10-honest-reality-check-system-ke-gaps--friction-points)
11. [7-Day Quick Start Action Plan (Dukaan par shuru kaise karein)](#11-7-day-quick-start-action-plan-dukaan-par-shuru-kaise-karein)

---

# 1. Dukaan ki Kahani: Pehle vs StockPilot ke Baad

| Pehle (Bina Software / Register System) | StockPilot ke Baad (Smart System) |
| :--- | :--- |
| Grahak ne pucha *"Bhaiya Fortune Tel hai?"* — Aap rack dekhne bhage, pata chala 2 ghante pehle hi khatam ho gaya. Grahak doosri dukan chala gaya. | Jaise hi 5 botal bachi thi, screen par **Red Alert** aa gaya aur Reorder list mein item jud gaya. Maal khatam hone se pehle naya box dukan par hota hai. |
| Shaam ko 2 ghante calculator lekar baithna padta tha: Kitna cash bika, kitna udhaar gaya, kitna profit hua. | Counter band karte waqt 1 click: Aaj ki total sale, cash vs UPI split, aur net profit screen par ready. |
| Dairy, bread ya dawaai piche padi-padi expire ho gayi. Hazaron rupaye ka seedha nuksaan. | System 7 din pehle bata deta hai: *"Yeh 8 packet agle hafte expire honge, inko aage rakh kar discount pe becho"*. |
| Distributor ne 50 packet ka bill banaya, tempo wale ne dukan par 45 hi utare. Ginti na hone se 5 packet ka nuksaan aapki jeb se hua. | Delivery aate hi Purchase Order open karke physical verification: 45 enter karo, 5 ka payment katega aur stock turant update hoga. |

---

# 2. Day 1: Dukaan ki Shuruat (Initial Setup)

Jab aap pehli baar login karte hain, toh screen blank hoti hai. Yahan pehle 1-2 din aapko thoda setup karna padta hai.

### A. Products & Inventory (`/inventory` / `/products`)
* **Yeh kya hai:** Aapki dukan ka poora saaman — har ek packet, botal, dabba jo aap bechte ho.
* **Manually kya enter karna padega:**
  1. **Item Name:** Jaise *Aashirvaad Shudh Chakki Atta 5kg*.
  2. **Category:** Groceries / Dairy / Beverages / Personal Care.
  3. **Cost Price (Kharid Bhaav):** Aapne distributor se kitne mein khareeda (e.g., ₹210).
  4. **Selling Price / MRP (Bikri Bhaav):** Grahak ko kitne mein bechna hai (e.g., ₹245).
  5. **Barcode:** Barcode scanner se packet scan kar do, number khud bhar jayega. Agar khula item hai (jaise Daal ya Chawal), toh `Generate Barcode` button dabao.
  6. **Current Stock:** Aaj aapki dukan mein iske kitne packet maujood hain (e.g., 20 packets).
  7. **Min Stock Threshold (Low Stock Warning):** Kitne packet bachein toh alert aana chahiye (e.g., 5 packets).
* **Time Kaise Bachega:**
  * Ek-ek item haath se bharne ki zaroorat nahi hai agar aapke paas Excel sheet hai.
  * **Bulk CSV Import:** `Import Products` par click karo, Excel sheet upload karo — 500 items 1 minute mein upload ho jaate hain.

### B. Suppliers / Wholesalers (`/suppliers`)
* **Yeh kya hai:** Aapke distributors ki digital diary.
* **Manually kya enter karna padega:**
  * Supplier ka naam (e.g., *Gupta Agency / Nestle Distributor*).
  * Contact Person, Phone Number, WhatsApp Number, Email.
  * GSTIN (agar Tax invoices hain).
  * **Lead Time:** Maal order karne ke kitne din baad delivery milti hai (e.g., 2 din).
* **Fayda:** Kal ko jab maal khatam hoga, toh distributor ka number ya purana bill dhoondne ke liye files nahi palatni padengi.

---

# 3. Rozana Ka Kaam: Billing Counter (POS Walkthrough)

Yeh wo screen hai jo **subah 9 baje se raat 10 baje tak** aapke counter ke laptop/computer par khuli rahegi: **`/pos`** (Point of Sale).

### Customer Aane Par Step-by-Step Kya Hota Hai:

```
[ Grahak Aaya ] 
      │
      ▼
[ Barcode Scan Kiya (Beep!) ] ────► Item Cart me Add ho gaya + Rate khud aa gaya
      │
      ▼
[ Payment Mode Select Kiya ] ────► Cash / UPI QR Code / Card
      │
      ▼
[ Complete Sale / Print ] ────► Receipt nikli + Stock se 1 piece INSTANTLY minus!
```

### Isme Manual Kya Hai vs Automatic Kya Hai?

#### ✍️ Aapko Manually Kya Karna Hai:
1. Counter par packet utha kar scanner ke aage dikhana hai.
2. Agar koi loose item hai jisme barcode nahi hota (jaise khule tamatar ya loose sugar): Search bar mein `Sugar` type karke quantity daalni hai.
3. Grahak ne kitna payment diya wo confirm karna hai (e.g., Cash diya ₹500, bill tha ₹420, toh change dena hai ₹80 — system screen par change calculate karke dikha deta hai).

#### ⚡ System Automatically Kya Karta Hai (Zero Effort):
1. **Total Amount + Tax:** GST calculation aur total khud jodta hai.
2. **Instant Inventory Reduction:** Jaise hi "Paid" daba, godown aur dukan ke stock se wo items minus ho gaye.
3. **Receipt Print:** Thermal printer se bill nikal deta hai.
4. **Sales Book Entry:** Daily ledger mein sale record ho gayi — raat ko register mein likhne ki koi zaroorat nahi.

---

# 4. Maal Mangwana: Suppliers & Purchase Orders

Dukan ka sabse bada headache hota hai: **"Kaunsa maal khatam ho raha hai aur kis distributor ko kitna order likhana hai?"**

### StockPilot ise kaise handle karta hai:

#### Step 1: Automatic Alert (`/alerts`)
* System har item ki bikri par nazar rakhta hai.
* Jaise hi kisi item ka stock aapke set kiye huye level (e.g., 5 packet) se kam hota hai, screen ke top par **Orange/Red Low Stock Badge** aa jata hai.

#### Step 2: Auto Draft Purchase Order (`/purchase-orders`)
* Pehle aapko diary lekar rack check karna padta tha ki kya-kya mangwana hai.
* StockPilot mein: `Generate PO` dabao. System un sabhi items ki list nikaal deta hai jo kam hain, unka distributor kaun hai wo match kar deta hai, aur recommend karta hai ki kitne packet mangwane chahiye.

#### Step 3: Truck/Tempo Arrival & Stock Update
* Distributor ka tempo dukan par aaya aur usne boxes utare.
* Aap StockPilot mein wahi Purchase Order open karte ho.
* **Button:** **`Mark as Received`**.
* **Manual Verification:** Agar aapne 50 box mangwaye the aur tempo wale ne 48 hi diye, toh quantity ko edit karke `48` kar do.
* **Result:** System khud stock mein 48 boxes jod deta hai. Ek bhi item ka naam dubara type nahi karna padta!

---

# 5. Expiry Aur Kharabi se Bachav: Perishables & Batches

Dairy items (Doodh, Dahi, Paneer), Packed snacks, Dawaaiyan, aur Cosmetics mein sabse bada nuksaan hota hai: **Expiry Date nikal jana**.

### Module: `/perishables` & `/batches`

#### Kaam Kaise Karta Hai:
1. **Jab naya maal aaye:** Maal chadhate waqt bas Batch Number aur Expiry Date daal do (e.g., *Batch: B-204, Expiry: 15 Oct 2026*).
2. **Daily Auto-Scan:** System har roz raat ko saare batches scan karta hai.
3. **Pre-Expiry Alerts:**
   * 7 din pehle alert: *"Attention: Amul Butter ke 10 packet 7 din mein expire hone wale hain!"*
   * 3 din pehle high alert: *"Urgent: Inko turant front counter par discount par lagao!"*
4. **Action:**
   * Agar bik gaya: Toh FIFO (First-In, First-Out) ke tahat purana batch pehle bech diya.
   * Agar kharaab ya toot gaya: Button dabao **`Mark as Damaged / Write-Off`**. System usko stock se hata dega aur profit/loss mein "Spoilage Loss" ki tarah record kar lega taaki hisaab barabar rahe.

---

# 6. Chori Aur Galti Pakadna: Stock Audits & Physical Counting

Retail dukan mein hamesha ek problem hoti hai: **"System bol raha hai 20 botal tel hona chahiye, lekin rack par 17 hi bachi hain. 3 botal kahan gayi?"** (Chori hui, gir ke phoot gayi, ya cashier ne galti se scan nahi kiya).

### Module: `/audits`

Is feature ka use mahine mein ek baar ya hafte mein ek category ke liye kiya jata hai:

1. **Audit Start Karo:** `/audits` mein jakar `New Stock Audit` select karo (e.g., *Cold Drinks Rack*).
2. **Haath se Ginti Karo (Physical Count):** Ek aadmi shelf par botal ginta hai aur app mein enter karta hai: *"Thums Up 500ml: 14 bottles"*.
3. **System Discrepancy (Antar) Dikhata Hai:**
   * System Count: `16`
   * Physical Count: `14`
   * **Variance (Nuksaan): `-2 bottles (Loss ₹80)`**.
4. **Reconciliation (Hisaab Barabar):** Ek click par stock ko correct karke `14` par set kar diya jata hai aur Reason mark ho jata hai: *Theft / Damage / Counting Error*. Isse aapke accountant ya CA ko saaf hisaab milta hai.

---

# 7. Grahak Sambhalna: Customers & Udhaar (Khata)

Har mohalle ki dukan aur regular retail store mein do cheezein hoti hain:
1. Loyal grahak jo baar-baar aate hain.
2. Regular grahak jo udhaar (credit) par samaan le jaate hain.

### Module: `/customers`

* **Grahak ka Record:** Customer ka Mobile Number daalne se uska poora naam, pichli kharidari, aur pasandida items dikhte hain.
* **Loyalty Points:** Har ₹100 ki kharidari par 1 point milta hai. Agli baar grahak un points ko bill mein discount ke liye redeem kar sakta hai.
* **Khata / Store Credit:** Agar customer bolta hai *"Bhaiya ₹500 abhi deta hoon, baaki ₹300 agle hafte"* — POS billing mein payment mode `Store Credit / Udhaar` select ho jata hai. Grahak ke account mein ₹300 pending balance show hone lagta hai. Jab wo aakar paise dega, toh `Record Payment` se khata clear ho jayega.

---

# 8. Raat ka Hisaab-Kitaab: Analytics & AI Assistant

Raat ko 10 baje jab dukan ka shutter girta hai, tab dukaandar thaka hota hai. Us waqt lambi-chaudi balance sheet dekhne ka man nahi karta.

### Dashboard & Analytics (`/dashboard`, `/analytics`):
1. **Aaj ki Kamai:** Total Sale kitni hui (e.g., ₹42,500).
2. **Payment Split:** Cash mein kitna aaya (₹18,000), UPI/QR se kitna aaya (₹24,500).
3. **Khaas Munafa (Net Profit):** Kharid bhaav hata kar aaj ki dukan ka saaf profit kitna bacha.
4. **Top Sellers vs Dead Stock:** Kaunse 5 items dhoom macha rahe hain, aur kaunsa item 2 mahine se dhool kha raha hai (jise aage nahi mangwana).

### AI Copilot (`/assistant`):
Aapko charts padhne ki zaroorat nahi hai. Aap seedha bol ya likh sakte ho:
* *"Aaj sabse zyada kya bika?"*
* *"Agle 3 din mein kaunsa maal khatam hone wala hai?"*
* *"Supplier Gupta ji ka kitna payment pending hai?"*
AI system se data nikaal kar simple bhasha mein answer de deta hai.

---

# 9. Clear Comparison: Manually Kya Karna Hai vs System Khud Kya Karega

Yahan dekhiye ki aapka manual kaam kahan khatam hota hai aur software kahan takeover karta hai:

| Karyawahi (Operation) | ✍️ Aapko Manually Karna Hi Padega | ⚡ System Khud Automatically Karega |
| :--- | :--- | :--- |
| **New Item Dukaan mein Aana** | Item ka naam, MRP, Cost Price aur Barcode scan karna. | Barcode printable label banana, system catalogue mein save karna. |
| **Counter par Grahak ko Saman Dena** | Barcode scanner se item scan karna, payment mode select karna. | Rate nikaalna, Total jodhna, GST lagana, Bill print karna, aur Inventory se stock minus karna. |
| **Khula Saman (Rice, Daal, Sabzi)** | Screen par naam search karke wazan (weight) daalna. | Rate per kg ke hisaab se exact price nikalna. |
| **Stock Kam Hona** | Kuch nahi karna! | Low Stock alert badge dikhana aur Reorder recommendation list banana. |
| **Naya Stock Dukan par Utarna** | Tempo wale ke samne physical dabbe gina aur verify karna. | Ek click par 50 alag-alag items ka stock warehouse aur shelf mein update karna. |
| **Kharaab / Tuta Saman** | Tuta hua packet dekh kar "Damage" mark karna. | Loss calculate karna aur balance sheet mein loss entry karna. |
| **Expiry ki Chinta** | Kuch nahi karna! | 7 din aur 3 din pehle warning pop-up dena ki kaunsa batch expire hone wala hai. |
| **Raat ka Hisaab** | Counter ke cash drawer ke note gina. | Total sale report, Profit report, aur UPI vs Cash report auto-generate karna. |

---

# 10. Honest Reality Check: System ke Gaps & Friction Points

Ek sachhe business partner ki tarah, hume pata hona chahiye ki **is software mein abhi kahan kamiyaan hain** jahan ek naye user ko dikkat aa sakti hai:

### 1. ⚠️ Cold Start Problem (Shuruat ka bojh)
* **Gap:** Agar aapki dukan mein 2,000 se 5,000 items hain, toh pehle hafte un sabko system mein daalna boring aur thakaane wala kaam lagta hai.
* **Friction:** Agar aapke paas Excel ka experience nahi hai, toh ek-ek item type karna padega.
* **Solution/Workaround:** Pehle din saari dukan mat chadhaiye! Sirf **top 50-100 fast-moving items** se shuru kijiye jo roz 80% bikte hain. Baaki items dheere-dheere roz 10-10 karke add karte rahiye.

### 2. ⚠️ Internet Dependency (Online Browser-based)
* **Gap:** StockPilot abhi web browser par chalta hai. Agar counter par broadband chala gaya ya mobile hotspot disconnect hua, toh billing screen ruk sakti hai.
* **Friction:** Counter par 5 customer khade hain aur internet ghoom raha hai toh dukaandar panic ho jata hai.
* **Zaroori Salah:** Dukan par ek reliable internet connection rakhein (Wi-Fi + backup phone hotspot).

### 3. ⚠️ Hardware Integration Setup (Thermal Printer & Weighing Scale)
* **Gap:** Normal computer printer se A4 print asaani se nikal jata hai, lekin 2-inch / 3-inch thermal receipt roll printer (ESC/POS) par print nikaalte waqt browser ka print dialog khulta hai.
* **Friction:** Cashier ko har bill par `Enter` ya `Print` confirm karna padta hai (silent 1-second auto-cut billing ke liye direct printer utility ki zaroorat hoti hai).
* **Weighing Scale:** Digital weighing scale se seedha weight read karne ke liye USB serial scale integration abhi fully plug-and-play nahi hai; weight manual type karna padta hai.

### 4. ⚠️ WhatsApp Direct Share Button
* **Gap:** Jab Purchase Order banta hai, toh distributor ko bhejne ke liye PDF download karke apne phone ke WhatsApp web se bhejna padta hai.
* **Friction:** Direct "Send via WhatsApp" ka 1-click button abhi directly integrate nahi hai.

### 5. ⚠️ Indian GST E-Invoicing / Composition Nuances
* **Gap:** Standard GST rates (0%, 5%, 12%, 18%, 28%) toh supported hain, lekin agar aap Composition Scheme wale dukaandar hain ya aapko Govt portal se seedha IRN / E-Way bill generate karna hai, toh wo direct API integration abhi nahi hai.

---

# 11. 7-Day Quick Start Action Plan (Dukaan par shuru kaise karein)

Aapko ek din mein expert nahi banna hai. Is 7-day plan ko follow kijiye:

```
[ Day 1 ] ──► Dukaan ki Top 20 Categories aur 5 Suppliers add karo (/suppliers)
    │
[ Day 2 ] ──► Top 50 fast-moving products add karo with Cost & Selling Price (/inventory)
    │
[ Day 3 ] ──► Barcode Scanner test karo: POS screen par 5 fake bills bana kar delete karo (/pos)
    │
[ Day 4 ] ──► Asli Grahako ki billing shuru karo — sirf POS use karo subah se shaam
    │
[ Day 5 ] ──► Low Stock Alerts dekho aur pehla Purchase Order banao (/purchase-orders)
    │
[ Day 6 ] ──► Dairy aur Perishables ke 5 items ki Expiry Date enter karo (/perishables)
    │
[ Day 7 ] ──► Raat ko Analytics Dashboard dekho: Total sale aur profit ka analysis karo (/analytics)
```

---

## 🎯 Final Words for the User

StockPilot ka maqsad aapko "computer clerk" banana nahi hai. Iska maqsad yeh hai ki:
1. **Dukan se chori aur galti band ho.**
2. **Grahak ko bina maal ke wapas na lautna pade.**
3. **Expired maal ka nuksaan zero ho.**
4. **Raat ko 10 baje aap bina kisi hisaab ke tanav ke sukoon se ghar ja sakein.**

Agar kisi bhi screen par koi confusion ho, toh seedha top right mein **AI Assistant** open karke apni aam bhasha mein sawaal pooch lijiye!
