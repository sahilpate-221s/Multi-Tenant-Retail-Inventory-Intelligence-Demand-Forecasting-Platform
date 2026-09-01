import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AccessTokenPayload {
  userId: string;
  storeId: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  // A random opaque token, NOT a JWT — its only job is to be looked up
  // in the refresh_tokens table, so it doesn't need to encode anything.
  return crypto.randomBytes(40).toString("hex");
}

export function hashRefreshToken(token: string): string {
  // SHA-256 is fine here (unlike passwords) because this token is already
  // high-entropy random data, not a low-entropy human-chosen password —
  // there's no feasible brute-force/rainbow-table risk to defend against.
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days