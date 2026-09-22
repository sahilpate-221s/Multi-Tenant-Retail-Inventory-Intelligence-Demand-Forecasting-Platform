# StockPilot — Production Rollback Playbook

This document defines standard operating procedures for executing rapid, zero-downtime rollbacks across all production layers (Frontend, Backend, ML, and Database).

---

## 1. When to Trigger a Rollback

Initiate an immediate rollback when any of the following conditions occur after a release:
* **High Severity Outage:** Smoke test fails on `/live`, `/ready`, or Frontend deep links.
* **Authentication Failure:** Users cannot log in or tokens fail validation.
* **Tenant Cross-Contamination:** Any bug exposing one store's data to another store.
* **Unacceptable Latency:** P95 response times exceed 3000ms consistently.

---

## 2. Layer-by-Layer Rollback Instructions

### 2.1 Frontend Rollback (Vercel) — Duration: ~10 seconds
Vercel maintains immutable previews and builds of every commit.

1. Navigate to **[vercel.com](https://vercel.com)** → Select **StockPilot Frontend**.
2. Click the **Deployments** tab.
3. Locate the last known good deployment (prior to the failing release).
4. Click the three dots `•••` icon on the right side of the row.
5. Click **Promote to Production**.
6. Confirm the prompt. The edge CDN instantly shifts traffic to the previous build without requiring a rebuild.

---

### 2.2 Backend API & ML Rollback (Render) — Duration: ~1 minute
Render stores past build artifacts and past deploy history.

#### Method A: Render Dashboard (Zero-Code Instant Rollback)
1. Navigate to **[dashboard.render.com](https://dashboard.render.com)**.
2. Select your service (`stockpilot-backend` or `stockpilot-ml`).
3. Click the **Events** or **Deploys** tab on the left navigation.
4. Locate the last successful deploy.
5. Click the `...` menu on that deploy and select **Rollback to this deploy**.
6. Render will instantly swap the active running container back to the previous release image.

#### Method B: Git Revert (Audited Rollback)
If you wish to maintain a permanent commit trail of the rollback:
```powershell
# In your local repository:
git revert HEAD --no-edit
git push origin master
git push origin master:main
```
Render and Vercel will automatically rebuild and deploy the reverted commit.

---

### 2.3 Database Rollback (Supabase PostgreSQL)
Because database operations involve state and persistent user records:

#### Case A: Backward-Compatible Schema Additions
If the failed deployment only added new columns or tables:
* **Action:** No database rollback is required. You can safely roll back the Backend code to the previous version; the previous code will simply ignore the new columns.

#### Case B: Destructive or Erroneous Migrations
1. Supabase automatically takes daily point-in-time snapshots.
2. Go to **Supabase Dashboard → Settings → Backups**.
3. Select the backup timestamp from immediately prior to your migration and select **Restore**.

---

### 2.4 Queue & Cache Rollback (Redis Cloud)
Redis is used for caching and BullMQ job queues.
* BullMQ jobs are transient and safe to purge if a bad worker state was introduced.
* To clear stuck or invalid queue state:
  Connect via Redis CLI or Redis Cloud Dashboard and execute:
  ```redis
  FLUSHDB
  ```
  The backend BullMQ workers will immediately re-initialize empty queues on the next health check cycle.

---

## 3. Rollback Verification Checklist

Immediately after triggering a rollback:

1. [ ] Run the smoke test runner:
   ```powershell
   powershell -File .\scripts\smoke-test.ps1
   ```
2. [ ] Verify Backend health:
   ```powershell
   Invoke-RestMethod -Uri "https://multi-tenant-retail-inventory.onrender.com/health"
   ```
3. [ ] Perform a manual login on `https://multi-tenant-retail-inventory-intel.vercel.app/login`.
4. [ ] Check Render service logs for runtime exceptions or unhandled rejections.

---

## 4. Rollback Drill & Validation Record

* **Drill Execution Date:** 2026-09-22
* **Scope Tested:**
  * **Vercel Frontend:** Verified atomic deployment rollback via instant promotion of prior immutable build artifact (`bom1` edge deployment). Zero build latency observed.
  * **Render Backend:** Verified rollback workflow using Git revert commit cycle across `main` and `master` branches with automated CI validation.
  * **Data Integrity:** Supabase database schema compatibility verified against prior application commit states; non-breaking migration strategy confirmed.
  * **Post-Rollback Health:** All 6 smoke test suite checks (`scripts/smoke-test.ps1`) executed with 100% pass rate.

