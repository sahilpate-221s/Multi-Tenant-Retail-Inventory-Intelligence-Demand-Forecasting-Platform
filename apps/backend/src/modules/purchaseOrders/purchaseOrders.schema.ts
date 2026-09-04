import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  productId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  expectedArrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;