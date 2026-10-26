import { Router, Request, Response } from "express";
import { telemetry } from "../../lib/telemetry";

const router = Router();

// Receives runtime error & scan failure telemetry reports from the POS Counter
router.post("/errors", (req: Request, res: Response) => {
  const { message, source, error, context, storeId, userId, role } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Missing message field" });
  }

  const recorded = telemetry.captureError({
    message: String(message),
    source: (source as any) || "pos_frontend",
    storeId: storeId || req.auth?.storeId,
    userId: userId || req.auth?.userId,
    role: role || req.auth?.role,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    } : undefined,
    context,
  });

  return res.status(200).json({ success: true, eventId: recorded.eventId });
});

export default router;
