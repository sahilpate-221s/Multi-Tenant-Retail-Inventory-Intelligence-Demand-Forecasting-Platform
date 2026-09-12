import { Request, Response } from "express";
import { generateAnomalies, generateInventoryAnomalies, listAnomalies, generateReturnAnomalies } from "./anomalies.service";


export async function postGenerate(req: Request, res: Response) {
  const demandResults = await generateAnomalies(req.auth!.storeId);
  const inventoryResults = await generateInventoryAnomalies(req.auth!.storeId);
  const returnResults = await generateReturnAnomalies(req.auth!.storeId);
  return res.status(200).json({
    success: true,
    data: { detectedCount: demandResults.length + inventoryResults.length + returnResults.length },
  });
}

export async function getAnomalies(req: Request, res: Response) {
  const data = await listAnomalies(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}