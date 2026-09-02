import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["name", "sku", "sellingPrice", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;