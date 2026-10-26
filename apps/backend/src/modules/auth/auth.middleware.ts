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

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Access restricted to Store Owner." },
      });
    }
    next();
  };
}

export const requireOwner = requireRole(["owner"]);