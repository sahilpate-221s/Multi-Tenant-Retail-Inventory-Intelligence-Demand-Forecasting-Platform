# 🎯 StockPilot — Master Interview Preparation & Architecture Guide
*Full-Stack, System Design, Frontend & Backend Questions, Solutions, and ChatGPT Prompts*

> 📌 **Full Document Path:** [`docs/INTERVIEW_PREPARATION_GUIDE.md`](docs/INTERVIEW_PREPARATION_GUIDE.md)

---

## 📌 Is Guide Ka Use Kaise Karein?

Yeh document is tarah design kiya gaya hai ki aap:
1. **Direct Interview ke liye padh sakein** (Self-study).
2. **ChatGPT ya Claude mein paste karke Mock Interview de sakein** (Prompt templates niche diye gaye hain).
3. **Resume par StockPilot ko ek High-Impact Engineering Project ki tarah present kar sakein.**

---

# 📑 Index

1. [Elevator Pitch (30-Second & 2-Minute Project Intro)](#1-elevator-pitch)
2. [Complete Tech Stack & Why It Was Chosen (Vs Alternatives)](#2-complete-tech-stack--why-it-was-chosen)
3. [Top 6 Complex Engineering Problems Solved in StockPilot](#3-top-6-complex-engineering-problems-solved)
4. [25 Most Asked Interview Questions & Model Answers](#4-25-most-asked-interview-questions--model-answers)
   - [Frontend & Performance (Q1 - Q7)](#frontend--performance-q1---q7)
   - [Backend, Database & Queues (Q8 - Q15)](#backend-database--queues-q8---q15)
   - [System Design & Multi-Tenancy (Q16 - Q20)](#system-design--multi-tenancy-q16---q20)
   - [Product, Edge Cases & Behavioral (Q21 - Q25)](#product-edge-cases--behavioral-q21---q25)
5. [ChatGPT Mock Interview Prompt Templates (Copy & Paste)](#5-chatgpt-mock-interview-prompt-templates)

---

# 1. Elevator Pitch

### ⚡ 30-Second Version (Quick Summary):
> *"StockPilot is an enterprise-grade retail inventory intelligence and POS platform built with React 19, Node.js/TypeScript, PostgreSQL, and Redis. Unlike traditional POS software that only tracks what is currently in stock, StockPilot predicts stockout risks, tracks perishables/expiry, provides a 3D digital twin warehouse audit using Three.js, and includes a high-speed camera barcode scanner with automated online catalog lookups and double-entry Khata ledger management."*

### 🚀 2-Minute Deep Dive (Comprehensive Version):
> *"I built StockPilot as a multi-tenant retail operating system aimed at solving three major retail pain points: inventory stockouts, manual billing bottlenecks, and unorganized customer credit (Khata).*
> 
> *On the frontend, it uses React 19, TypeScript, and Tailwind CSS. We implemented a high-speed counter billing POS with live audio-visual camera barcode scanning via WebRTC and HTML5-QRCode, featuring automated fallback lookup to Open Food Facts API for uncataloged items. It also features an interactive 3D digital twin aisle audit using Three.js and React Three Fiber to visualize warehouse shelf fullness in real-time.*
> 
> *On the backend, it's a modular monolith written in Node.js and Express with Drizzle ORM and PostgreSQL. To keep counter checkout responsive, heavy workloads like bulk CSV sales imports, dead-stock analysis, and AI demand forecasting are offloaded to Redis-backed BullMQ worker queues. Multi-tenancy is enforced strictly at the query layer via storeId scoping.*
> 
> *The system also features double-entry Khata ledgers for customer credit, perishable batch tracking with expiry alerts, and an LLM-powered AI Copilot that runs grounded database tool calls to assist store managers."*

---

# 2. Complete Tech Stack & Why It Was Chosen

| Component | Technology | Why Chosen? (Advantage over Alternatives) |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript + Vite** | Instant HMR build times with Vite (faster than Webpack/CRA). Strict type safety across components. |
| **State & Data Fetching** | **TanStack Query (React Query v5)** | Automatic server-state caching, background revalidation, optimistic updates, and cache invalidation on mutations without needing bulky Redux boilerplate. |
| **Form Validation** | **React Hook Form + Zod** | Uncontrolled input performance with zero re-renders on keystroke. Strict runtime and compile-time schema validation with Zod. |
| **3D Digital Twin** | **Three.js + React Three Fiber** | Enables spatial 3D visualization of warehouse racks and shelf stockout levels directly in the browser with WebGL. |
| **Barcode Scanner** | **HTML5-QRCode + WebRTC** | Allows any smartphone camera or laptop webcam to act as an industrial barcode scanner (supporting EAN-13, UPC, Code 128, QR) without needing expensive hardware. |
| **Online Barcode Enrichment** | **Open Food Facts API** | Zero-cost, public REST API integration that automatically resolves commercial barcodes to brand names, product titles, and package sizes. |
| **Backend Runtime** | **Node.js (v20+) + Express (TypeScript)** | Unified TypeScript language across frontend and backend. Modular monolith architecture with independent domain services. |
| **Database & ORM** | **PostgreSQL 16 + Drizzle ORM** | PostgreSQL provides ACID transactions, JSONB flexibility, and robust relational modeling. Drizzle ORM is chosen over Prisma for near-zero runtime overhead, pure SQL-like query builder, and lightweight bundle size. |
| **Queue & Background Jobs**| **Redis 7 + BullMQ** | Offloads high-latency CSV file parsing and ML forecasting computations away from the HTTP event loop, preventing counter checkout latency spikes. |
| **AI Copilot** | **Google GenAI (Gemini) / OpenAI** | Structured function/tool calling that executes verified SQL aggregate queries, eliminating AI hallucinations. |

---

# 3. Top 6 Complex Engineering Problems Solved

### 1. Camera Barcode Scanning with Instant On-The-Fly Online Catalog Enrichment
* **Problem:** Traditional POS systems fail when scanning an item not yet entered into the database. The cashier gets stuck or has to manually type everything.
* **Solution:** We engineered an asynchronous 3-tier lookup pipeline in `PosPage.tsx` and `barcodeLookup.ts`:
  1. Instant client-side memoized array lookup (`<2ms`).
  2. Backend PostgreSQL query by barcode / SKU (`~15ms`).
  3. If not found, asynchronous fetch to Open Food Facts API with an `AbortController` timeout (2.8s).
  4. Camera HUD displays live state (`searching` -> `found` -> `not_found`), plays WebAudio synthesized 1850Hz beep, and opens a Quick Add modal with the prefilled title so the cashier can set the price and complete the sale in 3 seconds.

### 2. Interactive 3D Spatial Digital Twin with WebGL Memory Safety
* **Problem:** Rendering complex 3D meshes for hundreds of supermarket shelves causes high GPU memory usage and canvas context loss if not managed properly.
* **Solution:** In `AisleAuditPage.tsx`, built modular procedural rack meshes using Three.js instanced geometry. Implemented raycasting for hover and click events to inspect shelf fullness percentages. Added strict `dispose()` cleanup lifecycles on unmount to prevent WebGL memory leaks.

### 3. Preventing Stock Concurrency & Race Conditions During High-Speed Checkout
* **Problem:** When multiple registers sell the same scarce item simultaneously, standard `read -> modify -> write` causes race conditions and negative inventory.
* **Solution:** Designed atomic decrement operations at the database layer with check constraints:
  `UPDATE inventory SET current_stock = current_stock - quantity WHERE product_id = $1 AND store_id = $2 AND current_stock >= quantity;`
  Ensures that if stock reaches zero, subsequent concurrent checkouts fail gracefully.

### 4. Asynchronous Bulk CSV Import Ingestion Pipeline
* **Problem:** Uploading a 50,000-row 90-day retail sales CSV blocks the Node.js event loop, freezing other API requests.
* **Solution:** Multi-part file upload with Multer buffers the file to disk and enqueues a background job into Redis via BullMQ. The background worker parses the stream in chunks using `csv-parse`, validates rows with Zod schemas, performs batch inserts, and emits progress updates via polling/WebSocket.

### 5. Double-Entry Khata (Customer Credit Ledger) Balance Integrity
* **Problem:** Calculating outstanding customer balance on the fly across hundreds of transactions can be slow and error-prone if ledger records are deleted or modified.
* **Solution:** Immutable transaction ledger (`khata_entries`) where every transaction is either a `DEBIT` (sale on credit) or a `CREDIT` (payment received). The customer's net outstanding balance is maintained through transactional balance updates and recomputed for verification during monthly statement reconciliation.

### 6. Zero-Hallucination Grounded AI Assistant
* **Problem:** Large language models hallucinate inventory counts, prices, and revenue figures when asked business questions.
* **Solution:** The AI Assistant uses tool-calling / function-calling. When a user asks *"Which category made the highest profit this week?"*, the LLM cannot invent a response; it is forced to call the `getSalesAnalytics` tool with strict parameter bounds (`startDate`, `endDate`, `storeId`). The server executes the aggregate SQL query and returns real data for the LLM to format.

---

# 4. 25 Most Asked Interview Questions & Model Answers

*(Full list of 25 comprehensive Q&As available in [`docs/INTERVIEW_PREPARATION_GUIDE.md`](docs/INTERVIEW_PREPARATION_GUIDE.md))*

---

# 5. ChatGPT Mock Interview Prompt Templates

Copy and paste these exact prompts into ChatGPT or Claude to practice for your technical interview:

### 📋 Prompt 1: Full-Stack Engineering Mock Interview
```
Act as a Principal Software Engineer at a leading tech company interviewing me for a Full-Stack Software Engineer role. 
I have built a project called StockPilot: a multi-tenant retail inventory intelligence and POS platform built with React 19, TypeScript, Node.js/Express, PostgreSQL, Drizzle ORM, Three.js, Redis, and BullMQ.

Interview me by asking 1 challenging question at a time. Cover architecture, state management, database concurrency, performance optimization, and API design. 
Wait for my response before evaluating my answer and asking the next question. Start by asking me to introduce the project.
```

### 📋 Prompt 2: System Design & Scalability Mock Interview
```
Act as a System Design Interviewer. I am presenting my project 'StockPilot', an enterprise retail POS and inventory management platform. 
Ask me deep architectural and system design questions about:
1. Scaling from 1 store to 10,000 retail stores with multi-tenancy.
2. Handling offline-first POS synchronization when internet drops.
3. Preventing stock concurrency race conditions during flash sales.
4. Designing an asynchronous background processing pipeline for 50,000-row CSV sales ingestion.

Ask 1 question at a time, critique my response with technical depth, and suggest how to improve it.
```

### 📋 Prompt 3: Product & Problem-Solving Mock Interview
```
Act as an Engineering Manager interviewing me about my portfolio project StockPilot. 
Ask me behavioral and technical problem-solving questions:
- What was the most difficult bug you encountered and how did you debug it?
- How did you make trade-offs between speed of delivery and code quality?
- How did you ensure a beginner shopkeeper can use a system with 30+ features without being overwhelmed?

Evaluate my answers using the STAR method (Situation, Task, Action, Result) and give constructive feedback after each answer.
```
