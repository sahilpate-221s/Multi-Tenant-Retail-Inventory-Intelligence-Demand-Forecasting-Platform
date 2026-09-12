import rateLimit from "express-rate-limit";

// Auth endpoints: strict, since these are the most valuable target for
// brute-force attacks (password guessing, account enumeration).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints: each call costs real money (Gemini API) - limit hard.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many AI requests. Please slow down." } },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: generous, but present - prevents runaway scripts/bugs
// from hammering the backend.
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
  standardHeaders: true,
  legacyHeaders: false,
});