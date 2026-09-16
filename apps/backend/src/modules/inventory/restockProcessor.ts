/**
 * Restock CSV processor with fuzzy product name matching.
 *
 * Matching priority:
 *   1. Exact SKU match (if "sku" column present)
 *   2. Exact name match (case-insensitive, whitespace-normalized)
 *   3. Fuzzy name match via bigram Dice coefficient (≥ 0.6 threshold)
 *
 * Fuzzy matches are returned as "warnings" so the user can verify
 * them in the preview before committing — they are never silently applied.
 */

import { parse } from "csv-parse/sync";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { products, inventory } from "../../db/schema";
import {
  restockRowShape,
  type RestockPreviewRow,
  type RestockRowError,
  type RestockPreviewResult,
} from "./restockSchema";

// ──────────────────────────────────────────────────────────────
// Fuzzy matching utilities — zero external dependencies
// ──────────────────────────────────────────────────────────────

/** Normalize a string for comparison: lowercase, collapse whitespace, strip punctuation */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")   // strip punctuation
    .replace(/\s+/g, " ")      // collapse multiple spaces
    .trim();
}

/** Extract character bigrams from a string */
function bigrams(s: string): Set<string> {
  const result = new Set<string>();
  const normalized = normalize(s);
  for (let i = 0; i < normalized.length - 1; i++) {
    result.add(normalized.slice(i, i + 2));
  }
  return result;
}

/**
 * Dice coefficient: 2 * |intersection| / (|A| + |B|)
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

const FUZZY_THRESHOLD = 0.6;

// ──────────────────────────────────────────────────────────────
// Main processor
// ──────────────────────────────────────────────────────────────

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
}

export async function processRestockCsv(
  storeId: string,
  fileBuffer: Buffer,
): Promise<RestockPreviewResult> {
  const rawRecords: Record<string, string>[] = parse(fileBuffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });

  // Load all store products with their current stock in one query
  const storeProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      currentStock: inventory.currentStock,
    })
    .from(products)
    .leftJoin(
      inventory,
      and(eq(products.id, inventory.productId), eq(inventory.storeId, storeId)),
    )
    .where(eq(products.storeId, storeId));

  // Build lookup maps
  const productsBySku = new Map<string, ProductWithStock>();
  const productsByNormalizedName = new Map<string, ProductWithStock>();
  const allProducts: ProductWithStock[] = [];

  for (const p of storeProducts) {
    const prod: ProductWithStock = {
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock ?? 0,
    };
    allProducts.push(prod);
    productsBySku.set(p.sku.toLowerCase(), prod);
    productsByNormalizedName.set(normalize(p.name), prod);
  }

  const validRows: RestockPreviewRow[] = [];
  const warnings: RestockPreviewRow[] = [];
  const errors: RestockRowError[] = [];
  const seenProducts = new Set<string>(); // prevent duplicate product entries

  for (let i = 0; i < rawRecords.length; i++) {
    const rowNumber = i + 2; // +2: 1-indexed plus header row
    const raw = rawRecords[i];

    const parsed = restockRowShape.safeParse({
      product: raw.product,
      sku: raw.sku,
      quantity: raw.quantity,
    });

    if (!parsed.success) {
      errors.push({
        rowNumber,
        rawData: raw,
        errorMessage: parsed.error.issues[0].message,
      });
      continue;
    }

    const quantity = Number(parsed.data.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({
        rowNumber,
        rawData: raw,
        errorMessage: `Invalid quantity: "${parsed.data.quantity}" (must be a positive whole number)`,
      });
      continue;
    }

    // ── Product matching cascade ──
    let matched: ProductWithStock | null = null;
    let matchType: RestockPreviewRow["matchType"] = "exact_name";
    let matchConfidence = 1.0;
    const csvProductName = parsed.data.sku || parsed.data.product || "";

    // 1. Try exact SKU match
    if (parsed.data.sku) {
      const skuMatch = productsBySku.get(parsed.data.sku.trim().toLowerCase());
      if (skuMatch) {
        matched = skuMatch;
        matchType = "exact_sku";
        matchConfidence = 1.0;
      }
    }

    // 2. Try exact name match (after normalization)
    if (!matched && parsed.data.product) {
      const nameNorm = normalize(parsed.data.product);
      const nameMatch = productsByNormalizedName.get(nameNorm);
      if (nameMatch) {
        matched = nameMatch;
        matchType = "exact_name";
        matchConfidence = 1.0;
      }
    }

    // 3. Try fuzzy name match
    if (!matched && parsed.data.product) {
      let bestScore = 0;
      let bestProduct: ProductWithStock | null = null;

      for (const prod of allProducts) {
        const score = diceCoefficient(parsed.data.product, prod.name);
        if (score > bestScore) {
          bestScore = score;
          bestProduct = prod;
        }
      }

      if (bestProduct && bestScore >= FUZZY_THRESHOLD) {
        matched = bestProduct;
        matchType = "fuzzy_name";
        matchConfidence = Math.round(bestScore * 100) / 100;
      }
    }

    if (!matched) {
      errors.push({
        rowNumber,
        rawData: raw,
        errorMessage: `No matching product found for: "${csvProductName}". Check the name/SKU and try again.`,
      });
      continue;
    }

    // Prevent duplicate product entries in the same file
    if (seenProducts.has(matched.id)) {
      errors.push({
        rowNumber,
        rawData: raw,
        errorMessage: `Duplicate entry: "${matched.name}" already appears earlier in this file. Combine quantities into one row.`,
      });
      continue;
    }
    seenProducts.add(matched.id);

    const previewRow: RestockPreviewRow = {
      rowNumber,
      productId: matched.id,
      productName: matched.name,
      csvProductName,
      sku: matched.sku,
      matchType,
      matchConfidence,
      quantity,
      currentStock: matched.currentStock,
      newStock: matched.currentStock + quantity,
    };

    // Fuzzy matches go to warnings so the user can review them
    if (matchType === "fuzzy_name") {
      warnings.push(previewRow);
    } else {
      validRows.push(previewRow);
    }
  }

  return {
    totalRows: rawRecords.length,
    validRows,
    warnings,
    errors,
  };
}
