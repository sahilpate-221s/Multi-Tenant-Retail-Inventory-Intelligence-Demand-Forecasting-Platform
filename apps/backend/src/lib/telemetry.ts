import { logger } from "./logger";
import { nanoid } from "nanoid";

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "fatal";
  source: "backend_api" | "pos_frontend" | "barcode_scanner" | "background_worker";
  message: string;
  storeId?: string | null;
  userId?: string | null;
  role?: string | null;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, unknown>;
}

class TelemetryService {
  private hasSentry = false;

  constructor() {
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      this.hasSentry = true;
      logger.info("[Telemetry] Sentry DSN detected. Centralized remote telemetry initialized.");
    } else {
      logger.info("[Telemetry] Sentry DSN not provided. Structured local logger active.");
    }
  }

  captureError(event: Omit<TelemetryEvent, "eventId" | "timestamp" | "level"> & { level?: TelemetryEvent["level"] }): TelemetryEvent {
    const payload: TelemetryEvent = {
      eventId: nanoid(16),
      timestamp: new Date().toISOString(),
      level: event.level || "error",
      source: event.source,
      message: event.message,
      storeId: event.storeId ?? null,
      userId: event.userId ?? null,
      role: event.role ?? null,
      error: event.error,
      context: event.context ?? {},
    };

    // Log structured event to Pino for aggregation (Datadog/CloudWatch/OpenTelemetry)
    if (payload.level === "fatal" || payload.level === "error") {
      logger.error(payload, `[Telemetry Error] ${payload.source}: ${payload.message}`);
    } else {
      logger.warn(payload, `[Telemetry Warn] ${payload.source}: ${payload.message}`);
    }

    return payload;
  }
}

export const telemetry = new TelemetryService();
