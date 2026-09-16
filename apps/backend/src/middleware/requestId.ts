import { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = nanoid(12);
  res.setHeader("X-Request-Id", req.requestId);
  next();
}