import { Request } from "express";

export function errorResponse(req: Request, code: string, message: string) {
  return {
    success: false,
    error: { code, message, requestId: req.requestId },
  };
}