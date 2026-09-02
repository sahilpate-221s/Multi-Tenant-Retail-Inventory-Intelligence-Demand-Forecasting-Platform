import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  reliabilityNotes: z.string().max(500).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;