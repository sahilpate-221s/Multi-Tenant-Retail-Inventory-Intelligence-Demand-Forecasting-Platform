import { Request, Response } from "express";
import { generateDeadStockScores, listDeadStockScores } from "./deadStock.service";

export async function postGenerate(req: Request, res: Response) {
  const results = await generateDeadStockScores(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { scoredCount: results.length } });
}

export async function getScores(req: Request, res: Response) {
  const minScore = req.query.minScore ? Number(req.query.minScore) : 30;
  const data = await listDeadStockScores(req.auth!.storeId, minScore);
  return res.status(200).json({ success: true, data });
}