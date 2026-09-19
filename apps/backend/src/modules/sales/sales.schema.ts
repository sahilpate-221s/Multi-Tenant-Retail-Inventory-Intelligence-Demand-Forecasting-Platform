import { z } from "zod";

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  productId: z.string().uuid().optional(),
});

export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;

export const createSaleItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});

export const createSaleSchema = z.object({
  saleDate: z.string().optional(),
  items: z.array(createSaleItemSchema).min(1, "At least one item is required"),
  notes: z.string().max(500).optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
