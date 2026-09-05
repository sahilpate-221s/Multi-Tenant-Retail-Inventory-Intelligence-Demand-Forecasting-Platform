import { Request, Response } from "express";
import { getForecastForProduct } from "./forecasting.service";
import { generateAndStoreForecast, getLatestForecast, getForecastHistory } from "./forecasting.service";

export async function getForecast(req: Request, res: Response) {
  try {
    const result = await getForecastForProduct(req.auth!.storeId, req.params.productId as string);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "ML_SERVICE_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        error: { code: "ML_SERVICE_UNAVAILABLE", message: "Forecasting is temporarily unavailable. Other features are unaffected." },
      });
    }
    console.error("Forecast error:", err);
    return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found or forecast failed." } });
  }
}


export async function postGenerateForecast(req: Request, res: Response) {
  const horizonDays = req.body.horizonDays === 30 ? 30 : 7;
  try {
    const run = await generateAndStoreForecast(req.auth!.storeId, req.params.productId as string, horizonDays);
    return res.status(201).json({ success: true, data: run });
  } catch (err) {
    if (err instanceof Error && err.message === "ML_SERVICE_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        error: { code: "ML_SERVICE_UNAVAILABLE", message: "Forecasting is temporarily unavailable." },
      });
    }
    console.error("Forecast generation error:", err);
    return res.status(404).json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found or forecast failed." } });
  }
}

export async function getLatest(req: Request, res: Response) {
  const horizonDays = req.query.horizonDays === "30" ? 30 : 7;
  const run = await getLatestForecast(req.auth!.storeId, req.params.productId as string, horizonDays);
  if (!run) {
    return res.status(404).json({ success: false, error: { code: "NO_FORECAST_YET", message: "No forecast has been generated for this product yet." } });
  }
  return res.status(200).json({ success: true, data: run });
}

export async function getHistory(req: Request, res: Response) {
  const history = await getForecastHistory(req.auth!.storeId, req.params.productId as string);
  return res.status(200).json({ success: true, data: history });
}