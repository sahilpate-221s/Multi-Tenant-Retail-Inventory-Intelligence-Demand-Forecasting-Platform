import { z } from "zod";

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  quantityChange: z.number().int().refine((n) => n !== 0, "Quantity change cannot be zero."),
  reason: z.enum(["restock", "manual_adjustment", "correction", "damage", "return"]),
  note: z.string().max(500).optional(),
});

export const updateInventorySettingsSchema = z.object({
  minStock: z.number().int().nonnegative().optional(),
  safetyStock: z.number().int().nonnegative().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateInventorySettingsInput = z.infer<typeof updateInventorySettingsSchema>;