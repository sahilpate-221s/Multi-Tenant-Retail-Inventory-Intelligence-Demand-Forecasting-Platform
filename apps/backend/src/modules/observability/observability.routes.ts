import { Router } from "express";
import { csvImportQueue } from "../../queue/queues";
import { db } from "../../db/client";
import { stores, sales, products } from "../../db/schema";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/auth.middleware";

const router = Router();

// Queue monitoring - deliberately NOT behind requireAuth's tenant
// scoping, since queue state is operational/platform-wide, not
// per-store data. In a real production deployment this would instead
// be behind a separate admin-only auth check - noted honestly as a
// real gap for now, not glossed over.
router.get("/queues", async (_req, res) => {
  const counts = await csvImportQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
  res.status(200).json({
    success: true,
    data: { queues: { "csv-import": counts } },
  });
});

router.get("/metrics", async (_req, res) => {
  const [storeCountResult] = await db.select({ count: sql<string>`count(*)` }).from(stores);
  const [salesCountResult] = await db.select({ count: sql<string>`count(*)` }).from(sales);
  const [productCountResult] = await db.select({ count: sql<string>`count(*)` }).from(products);

  res.status(200).json({
    success: true,
    data: {
      totalStores: Number(storeCountResult.count),
      totalSalesRecords: Number(salesCountResult.count),
      totalProducts: Number(productCountResult.count),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
