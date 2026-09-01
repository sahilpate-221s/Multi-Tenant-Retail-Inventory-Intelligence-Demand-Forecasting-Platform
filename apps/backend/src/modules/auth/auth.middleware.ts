import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "./tokens";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required." },
    });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Session expired or invalid. Please log in again." },
    });
  }
}