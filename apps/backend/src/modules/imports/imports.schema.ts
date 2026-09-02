import { z } from "zod";

// What we expect each CSV row to look like once parsed. Note everything
// comes in as a string from CSV — coercion/validation happens explicitly
// in the normalization step, not here, so we can give precise per-field
// error messages instead of one opaque Zod error per row.
export const csvRowShape = z.object({
  date: z.string().min(1, "Date is required"),
  product: z.string().min(1, "Product is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().optional(),
});

export type CsvRowShape = z.infer<typeof csvRowShape>;

export interface NormalizedRow {
  rowNumber: number;
  saleDate: string; // YYYY-MM-DD
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface RowError {
  rowNumber: number;
  rawData: Record<string, string>;
  errorMessage: string;
}

export interface PreviewResult {
  totalRows: number;
  validRows: NormalizedRow[];
  errors: RowError[];
  duplicates: RowError[];
}