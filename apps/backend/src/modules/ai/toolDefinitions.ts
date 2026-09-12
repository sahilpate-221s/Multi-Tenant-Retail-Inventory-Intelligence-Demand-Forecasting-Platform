import { FunctionDeclaration, Type } from "@google/genai";

export const toolDefinitions: FunctionDeclaration[] = [
  {
    name: "get_at_risk_products",
    description:
      "Get products at risk of STOCKING OUT (running out of stock) soon, ranked by urgency. Use ONLY for questions about running out, low stock, or things needing to be reordered soon. Do NOT use this for slow-moving or dead stock questions - use get_dead_stock for that.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_reorder_recommendations",
    description: "Get current pending reorder recommendations. Use when the user asks what they should reorder or restock.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_dead_stock",
    description:
      "Get products that are slow-moving, dead, or unsold, with capital tied up. Use for slow-moving, dead stock, unsold inventory, or tied-up capital questions. Do NOT use this for stockout/low-stock questions - use get_at_risk_products for that.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_inventory_summary",
    description: "Get a summary of current inventory levels across products. Use for general current-stock-level questions.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_anomalies",
    description: "Get recently detected unusual demand, inventory, or return patterns. Use when asked if anything unusual happened.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_product_details",
    description: "Look up details for a specific product by name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING, description: "The name or partial name of the product." },
      },
      required: ["productName"],
    },
  },
];

export const toolNameToFunction: Record<string, string> = {
  get_at_risk_products: "tool_get_at_risk_products",
  get_reorder_recommendations: "tool_get_reorder_recommendations",
  get_dead_stock: "tool_get_dead_stock",
  get_inventory_summary: "tool_get_inventory_summary",
  get_anomalies: "tool_get_anomalies",
  get_product_details: "tool_get_product_details",
};