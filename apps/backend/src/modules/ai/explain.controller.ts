import { Request, Response } from "express";
import { explainReorderRecommendation, explainDeadStock, explainStockoutRisk, explainAnomaly, ExplainError } from "./explain.service";

const explainers: Record<string, (storeId: string, id: string) => Promise<{ explanation: string }>> = {
  "reorder-recommendation": explainReorderRecommendation,
  "dead-stock": explainDeadStock,
  "stockout-risk": explainStockoutRisk,
  anomaly: explainAnomaly,
};

export async function postExplain(req: Request, res: Response) {
  const type = String(req.params.type);
  const id = String(req.params.id);
  const explainFn = explainers[type];
  if (!explainFn) {
    return res.status(400).json({ success: false, error: { code: "INVALID_TYPE", message: "Unknown explanation type." } });
  }

  try {
    const result = await explainFn(req.auth!.storeId, id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof ExplainError) {
      const status = err.code === "NOT_FOUND" ? 404 : 503;
      return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Explain error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}