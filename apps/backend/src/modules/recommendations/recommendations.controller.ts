import { Request, Response } from "express";
import { generateRecommendations, listRecommendations, updateRecommendationStatus } from "./recommendations.service";

export async function postGenerate(req: Request, res: Response) {
  const created = await generateRecommendations(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { generatedCount: created.length, recommendations: created } });
}

export async function getRecommendations(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const data = await listRecommendations(req.auth!.storeId, status);
  return res.status(200).json({ success: true, data });
}

export async function patchStatus(req: Request, res: Response) {
  const { status } = req.body;
  if (status !== "ordered" && status !== "dismissed") {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "status must be 'ordered' or 'dismissed'." } });
  }
  const updated = await updateRecommendationStatus(req.auth!.storeId, req.params.id as string, status);
  if (!updated) {
    return res.status(404).json({ success: false, error: { code: "RECOMMENDATION_NOT_FOUND", message: "Recommendation not found." } });
  }
  return res.status(200).json({ success: true, data: updated });
}