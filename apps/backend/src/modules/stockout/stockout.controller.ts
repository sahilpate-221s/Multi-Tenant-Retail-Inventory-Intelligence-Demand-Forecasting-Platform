import { Request, Response } from "express";
import { generateStockoutPredictions, listStockoutPredictions } from "./stockout.service";

export async function postGenerate(req: Request, res: Response) {
  const results = await generateStockoutPredictions(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { analyzedCount: results.length } });
}

export async function getPredictions(req: Request, res: Response) {
  const data = await listStockoutPredictions(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}