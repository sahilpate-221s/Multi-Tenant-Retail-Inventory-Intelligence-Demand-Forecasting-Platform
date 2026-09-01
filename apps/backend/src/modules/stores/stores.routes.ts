import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores } from "../../db/schema";
import { requireAuth } from "../auth/auth.middleware";

const router = Router();

// Tenant-scoped: notice this NEVER reads a store ID from params, query,
// or body. It only ever uses req.auth.storeId — the value the auth
// middleware derived from a cryptographically verified JWT. This is
// the entire mechanism that makes cross-tenant access structurally
// impossible, not just "usually prevented."
router.get("/current", requireAuth, async (req, res) => {
  const store = await db.query.stores.findFirst({
    where: eq(stores.id, req.auth!.storeId),
  });

  if (!store) {
    return res.status(404).json({
      success: false,
      error: { code: "STORE_NOT_FOUND", message: "Store not found." },
    });
  }

  return res.status(200).json({
    success: true,
    data: { id: store.id, name: store.name, timezone: store.timezone, currency: store.currency },
  });
});

export default router;