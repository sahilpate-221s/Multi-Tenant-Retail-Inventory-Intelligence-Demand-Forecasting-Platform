import pino from "pino";

const SENSITIVE_FIELDS = ["password", "passwordHash", "token", "accessToken", "refreshToken", "apiKey", "authorization"];

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: SENSITIVE_FIELDS.flatMap((field) => [
      field,
      `*.${field}`,
      `req.body.${field}`,
      `req.headers.${field}`,
    ]),
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});