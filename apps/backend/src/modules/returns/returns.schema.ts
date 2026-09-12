import { z } from "zod";

export const createReturnSchema = z.object({
  saleItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().max(255).optional(),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;