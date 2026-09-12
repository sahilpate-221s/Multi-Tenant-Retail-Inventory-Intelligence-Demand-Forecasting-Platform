import { Request, Response } from "express";
import { runSimulation, listSimulations, SimulationError } from "./simulator.service";

export async function postSimulate(req: Request, res: Response) {
  try {
    const result = await runSimulation(req.auth!.storeId, {
      productId: req.body.productId,
      demandChangePercent: req.body.demandChangePercent,
      supplierDelayDays: req.body.supplierDelayDays,
      budgetLimit: req.body.budgetLimit,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof SimulationError) {
      return res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
    }
    console.error("Simulation error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}

export async function getSimulations(req: Request, res: Response) {
  const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
  const data = await listSimulations(req.auth!.storeId, productId);
  return res.status(200).json({ success: true, data });
}