import { Request, Response } from "express";
import { getDashboardData } from "./analytics.service";

export async function getDashboard(req: Request, res: Response) {
  const periodDays = req.query.days ? Number(req.query.days) : 30;
  if (!Number.isInteger(periodDays) || periodDays <= 0 || periodDays > 365) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "days must be an integer between 1 and 365." },
    });
  }
  const data = await getDashboardData(req.auth!.storeId, periodDays);
  return res.status(200).json({ success: true, data });
}