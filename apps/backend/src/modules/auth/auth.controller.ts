import { Request, Response } from "express";
import { registerSchema, loginSchema, changePasswordSchema } from "./auth.schema";
import {
  registerStoreAndOwner,
  loginWithCredentials,
  refreshSession,
  revokeRefreshToken,
  updateUserPassword,
  AuthError,
} from "./auth.service";
import { logAuditEvent } from "../audit/audit.service";
import { errorResponse } from "../../lib/apiError";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", parsed.error.issues[0].message));
  }

  try {
    const { store, user } = await registerStoreAndOwner(parsed.data);
    return res.status(201).json({
      success: true,
      data: { storeId: store.id, userId: user.id, email: user.email },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(409).json(errorResponse(req, err.code, err.message));
    }
    console.error("Registration error:", err);
    return res.status(500).json(errorResponse(req, "INTERNAL_ERROR", "Something went wrong. Please try again."));
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", parsed.error.issues[0].message));
  }

  try {
    const { accessToken, refreshTokenPlain, user } = await loginWithCredentials(parsed.data);
    await logAuditEvent({
      storeId: user.storeId,
      userId: user.id,
      action: "LOGIN",
      ipAddress: req.ip,
    });
    res.cookie("refreshToken", refreshTokenPlain, REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      data: { accessToken, user: { id: user.id, email: user.email, storeId: user.storeId, role: user.role } },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json(errorResponse(req, err.code, err.message));
    }
    console.error("Login error:", err);
    return res.status(500).json(errorResponse(req, "INTERNAL_ERROR", "Something went wrong. Please try again."));
  }
}

export async function refresh(req: Request, res: Response) {
  const refreshTokenPlain = req.cookies?.refreshToken;

  if (!refreshTokenPlain) {
    return res.status(401).json(errorResponse(req, "NO_REFRESH_TOKEN", "No session found."));
  }

  try {
    const { accessToken, refreshTokenPlain: newRefreshToken, user } = await refreshSession(refreshTokenPlain);
    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      data: { accessToken, user: { id: user.id, email: user.email, storeId: user.storeId, role: user.role } },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json(errorResponse(req, err.code, err.message));
    }
    console.error("Refresh error:", err);
    return res.status(500).json(errorResponse(req, "INTERNAL_ERROR", "Something went wrong."));
  }
}

export async function logout(req: Request, res: Response) {
  const refreshTokenPlain = req.cookies?.refreshToken;
  if (refreshTokenPlain) {
    await revokeRefreshToken(refreshTokenPlain);
  }
  res.clearCookie("refreshToken", { path: "/api/auth" });
  await logAuditEvent({
    action: "LOGOUT",
    ipAddress: req.ip,
  });
  return res.status(200).json({ success: true, data: { message: "Logged out." } });
}

export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(errorResponse(req, "VALIDATION_ERROR", parsed.error.issues[0].message));
  }

  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse(req, "UNAUTHORIZED", "Authentication required."));
  }

  try {
    await updateUserPassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
    return res.status(200).json({
      success: true,
      data: { message: "Password updated successfully." },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(400).json(errorResponse(req, err.code, err.message));
    }
    console.error("Change password error:", err);
    return res.status(500).json(errorResponse(req, "INTERNAL_ERROR", "Failed to update password."));
  }
}
