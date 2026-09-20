import rateLimit from "express-rate-limit";

const isLoadTest = (req: any) =>
  process.env.DISABLE_RATE_LIMIT === "true" ||
  (process.env.NODE_ENV !== "production" && req.headers["x-load-test"] === "true");

// Auth endpoints: strict, since these are the most valuable target for
// brute-force attacks (password guessing, account enumeration).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: isLoadTest,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints: each call costs real money (Gemini API) - limit hard.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  skip: isLoadTest,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many AI requests. Please slow down." } },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: generous (600 req/min = 10 req/sec per store IP to accommodate
// multi-terminal retail counters), while preventing runaway scripts/DDoS attacks.
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  skip: isLoadTest,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
  standardHeaders: true,
  legacyHeaders: false,
});