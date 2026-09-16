import { z } from "zod";

// What we expect each restock CSV row to look like.
// Supports two modes: by product name or by SKU.
export const restockRowShape = z.object({
  product: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.string().min(1, "Quantity is required"),
}).refine(
  (row) => (row.product && row.product.trim().length > 0) || (row.sku && row.sku.trim().length > 0),
  { message: "Either 'product' or 'sku' column is required" },
);

export type RestockRowShape = z.infer<typeof restockRowShape>;

export interface RestockPreviewRow {
  rowNumber: number;
  productId: string;
  productName: string;       // the actual product name in DB
  csvProductName: string;    // what the CSV said (product name or SKU)
  sku: string;
  matchType: "exact_sku" | "exact_name" | "fuzzy_name";
  matchConfidence: number;   // 1.0 for exact, 0.6-0.99 for fuzzy
  quantity: number;
  currentStock: number;
  newStock: number;          // currentStock + quantity
}

export interface RestockRowError {
  rowNumber: number;
  rawData: Record<string, string>;
  errorMessage: string;
}

export interface RestockPreviewResult {
  totalRows: number;
  validRows: RestockPreviewRow[];
  warnings: RestockPreviewRow[];   // fuzzy matches shown separately for review
  errors: RestockRowError[];
}
