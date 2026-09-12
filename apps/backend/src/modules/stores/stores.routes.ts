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

import { z } from "zod";

const updateStoreSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  timezone: z.string().min(1).max(100).optional(),
  currency: z.string().min(1).max(10).optional(),
});

router.patch("/current", requireAuth, async (req, res) => {
  const parsed = updateStoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
    });
  }

  const existing = await db.query.stores.findFirst({
    where: eq(stores.id, req.auth!.storeId),
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: "STORE_NOT_FOUND", message: "Store not found." },
    });
  }

  const [updated] = await db
    .update(stores)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.timezone ? { timezone: parsed.data.timezone } : {}),
      ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
      updatedAt: new Date(),
    })
    .where(eq(stores.id, req.auth!.storeId))
    .returning();

  return res.status(200).json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      timezone: updated.timezone,
      currency: updated.currency,
    },
  });
});

export default router;