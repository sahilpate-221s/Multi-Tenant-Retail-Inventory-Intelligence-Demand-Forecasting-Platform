import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import { requireAuth, requireOwner } from "../auth/auth.middleware";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);

router.get("/", async (req, res) => {
  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.storeId, req.auth!.storeId),
    orderBy: desc(auditLogs.createdAt),
    limit: 100,
  });
  res.status(200).json({ success: true, data: logs });
});

export default router;
