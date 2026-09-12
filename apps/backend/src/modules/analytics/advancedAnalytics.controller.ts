import { Request, Response } from "express";
import { getRecommendationMetrics, getCapitalEfficiency, getCategoryIntelligence } from "./advancedAnalytics.service";
import { getForecastPerformance } from "./forecastPerformance.service";

export async function getAdvancedAnalytics(req: Request, res: Response) {
  const [recommendationMetrics, capitalEfficiency, categoryIntelligence, forecastPerformance] = await Promise.all([
    getRecommendationMetrics(req.auth!.storeId),
    getCapitalEfficiency(req.auth!.storeId),
    getCategoryIntelligence(req.auth!.storeId),
    getForecastPerformance(req.auth!.storeId),
  ]);

  return res.status(200).json({
    success: true,
    data: { recommendationMetrics, capitalEfficiency, categoryIntelligence, forecastPerformance },
  });
}