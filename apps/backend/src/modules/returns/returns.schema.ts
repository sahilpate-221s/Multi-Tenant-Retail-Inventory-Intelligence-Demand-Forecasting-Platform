import { z } from "zod";

export const createReturnSchema = z.object({
  saleItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().max(255).optional(),
  refundMode: z.enum(["cash", "exchange_credit"]).optional(),
  refundAmount: z.number().optional(),
});

export const processReturnSchema = z.object({
  saleId: z.string().uuid(),
  refundMode: z.enum(["cash", "exchange_credit"]).default("cash"),
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        reason: z.string().max(255).optional(),
      })
    )
    .min(1, "At least one item must be returned"),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type ProcessReturnInput = z.infer<typeof processReturnSchema>;