// the actual parsing/validation/normalization logic:

import { parse } from "csv-parse/sync";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { products, sales, saleItems } from "../../db/schema";
import { csvRowShape, type NormalizedRow, type RowError, type PreviewResult } from "./imports.schema";

function parseDate(raw: string): string | null {
  // Accept common formats: DD/MM/YYYY, YYYY-MM-DD. Real-world CSVs are
  // inconsistent about this (spec section 26 explicitly calls out
  // "inconsistent date formats" as something to handle, not reject outright).
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (parsedDate.getMonth() !== Number(month) - 1) return null; // catches invalid dates like 32/13/2026
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

export async function processCsv(storeId: string, fileBuffer: Buffer): Promise<PreviewResult> {
  const rawRecords: Record<string, string>[] = parse(fileBuffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });

  const storeProducts = await db.query.products.findMany({ where: eq(products.storeId, storeId) });
  const productsByName = new Map(storeProducts.map((p) => [p.name.toLowerCase(), p]));

  const validRows: NormalizedRow[] = [];
  const errors: RowError[] = [];
  const seenInThisFile = new Set<string>();
  const duplicates: RowError[] = [];

  for (let i = 0; i < rawRecords.length; i++) {
    const rowNumber = i + 2; // +2: 1-indexed, plus the header row itself
    const raw = rawRecords[i];

    const parsed = csvRowShape.safeParse({
      date: raw.date,
      product: raw.product,
      quantity: raw.quantity,
      unitPrice: raw.unitprice,
    });

    if (!parsed.success) {
      errors.push({ rowNumber, rawData: raw, errorMessage: parsed.error.issues[0].message });
      continue;
    }

    const saleDate = parseDate(parsed.data.date);
    if (!saleDate) {
      errors.push({ rowNumber, rawData: raw, errorMessage: `Invalid or unrecognized date: "${parsed.data.date}"` });
      continue;
    }

    const quantity = Number(parsed.data.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({ rowNumber, rawData: raw, errorMessage: `Invalid quantity: "${parsed.data.quantity}" (must be a positive whole number)` });
      continue;
    }

    const product = productsByName.get(parsed.data.product.trim().toLowerCase());
    if (!product) {
      errors.push({ rowNumber, rawData: raw, errorMessage: `Unknown product: "${parsed.data.product}" (no matching product in your catalog)` });
      continue;
    }

    const unitPrice = parsed.data.unitPrice ? Number(parsed.data.unitPrice) : Number(product.sellingPrice);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      errors.push({ rowNumber, rawData: raw, errorMessage: `Invalid unit price: "${parsed.data.unitPrice}"` });
      continue;
    }

    // Duplicate detection within THIS file (e.g., the exact same line pasted twice)
    const dedupeKey = `${saleDate}|${product.id}|${quantity}|${unitPrice}`;
    if (seenInThisFile.has(dedupeKey)) {
      duplicates.push({ rowNumber, rawData: raw, errorMessage: "Duplicate row within this file (same date, product, quantity, price)." });
      continue;
    }
    seenInThisFile.add(dedupeKey);

    // Duplicate detection against EXISTING sales already in the database
    const existingSale = await db
      .select()
      .from(sales)
      .innerJoin(saleItems, eq(sales.id, saleItems.saleId))
      .where(
        and(
          eq(sales.storeId, storeId),
          eq(sales.saleDate, saleDate),
          eq(saleItems.productId, product.id),
          eq(saleItems.quantity, quantity),
        ),
      )
      .limit(1);

    if (existingSale.length > 0) {
      duplicates.push({ rowNumber, rawData: raw, errorMessage: "This sale already exists in your records (same date, product, quantity)." });
      continue;
    }

    validRows.push({
      rowNumber,
      saleDate,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal: Math.round(quantity * unitPrice * 100) / 100,
    });
  }

  return { totalRows: rawRecords.length, validRows, errors, duplicates };
}