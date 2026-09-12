import { db } from "../../db/client";
import { eq, and } from "drizzle-orm";
import { products } from "../../db/schema";
import { listStockoutPredictions } from "../stockout/stockout.service";
import { listRecommendations } from "../recommendations/recommendations.service";
import { listDeadStockScores } from "../deadStock/deadStock.service";
import { listInventory } from "../inventory/inventory.service";
import { listAnomalies } from "../anomalies/anomalies.service";

/**
 * Every tool function takes storeId as its FIRST argument, sourced only
 * from req.auth.storeId at the call site (ai.service.ts) - never from
 * anything the LLM supplies. This is the actual mechanism that makes
 * cross-tenant leakage structurally impossible here, not just policy.
 */

export async function tool_get_at_risk_products(storeId: string) {
  const risks = await listStockoutPredictions(storeId);
  return risks.filter((r) => r.riskLevel !== "low").slice(0, 10);
}

export async function tool_get_reorder_recommendations(storeId: string) {
  const recs = await listRecommendations(storeId, "pending");
  return recs.slice(0, 10);
}

export async function tool_get_dead_stock(storeId: string) {
  const scores = await listDeadStockScores(storeId, 30);
  return scores.slice(0, 10);
}

export async function tool_get_inventory_summary(storeId: string) {
  const items = await listInventory(storeId);
  return items.slice(0, 20);
}

export async function tool_get_anomalies(storeId: string) {
  const anomalies = await listAnomalies(storeId);
  return anomalies.slice(0, 10);
}

export async function tool_get_product_details(storeId: string, args: { productName: string }) {
  // Even though this tool takes a parameter FROM the LLM (productName),
  // the query is still hard-filtered by storeId - so at worst, an
  // adversarial input just fails to match anything in THIS store. It
  // can never be used to pivot into another tenant's data, because the
  // storeId filter is not something the parameter can override.
  const results = await db.query.products.findMany({
    where: and(eq(products.storeId, storeId)),
  });
  const match = results.find((p) => p.name.toLowerCase().includes(args.productName.toLowerCase()));
  if (!match) return { found: false, message: `No product matching "${args.productName}" found.` };
  return { found: true, product: match };
}