import { z } from "zod";

export const linkSupplierProductSchema = z.object({
  supplierId: z.string().uuid(),
  productId: z.string().uuid(),
  leadTimeDays: z.number().int().positive(),
  moq: z.number().int().positive().default(1),
  cost: z.number().nonnegative(),
});

export type LinkSupplierProductInput = z.infer<typeof linkSupplierProductSchema>;