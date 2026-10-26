// Centralized frontend error logging and crash telemetry

interface TelemetryPayload {
  message: string;
  source: "pos_frontend" | "barcode_scanner" | "network";
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, unknown>;
  storeId?: string | null;
  userId?: string | null;
  role?: string | null;
}

const BACKEND_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "";

async function sendTelemetry(payload: TelemetryPayload) {
  try {
    // Read local auth info if present
    const storedAuth = localStorage.getItem("stockpilot_auth");
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        payload.storeId = payload.storeId || parsed.user?.storeId;
        payload.userId = payload.userId || parsed.user?.id;
        payload.role = payload.role || parsed.user?.role;
      } catch {
        // Ignore JSON parse error
      }
    }

    const res = await fetch(`${BACKEND_BASE}/api/telemetry/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data.eventId;
    }
  } catch {
    // Silently avoid recursive loop if telemetry network call fails
  }
}

export const telemetry = {
  /**
   * Reports an unhandled or caught JavaScript exception with stack trace
   */
  reportError(error: Error | unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Telemetry] Reporting error:", err.message, context);

    sendTelemetry({
      message: err.message,
      source: "pos_frontend",
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      context,
    });
  },

  /**
   * Reports barcode scanner failure at counter (e.g., unrecognizable symbology, camera failure)
   */
  reportScanFailure(barcode: string, reason: string, context?: Record<string, unknown>) {
    console.warn(`[Telemetry] Barcode scan failure for "${barcode}": ${reason}`);

    sendTelemetry({
      message: `Barcode scan failed: ${reason} (code: ${barcode})`,
      source: "barcode_scanner",
      context: {
        barcode,
        reason,
        ...context,
      },
    });
  },

  /**
   * Reports network timeout or connection drop at counter
   */
  reportNetworkTimeout(endpoint: string, durationMs: number) {
    console.warn(`[Telemetry] Network timeout on ${endpoint} after ${durationMs}ms`);

    sendTelemetry({
      message: `POS Network timeout on ${endpoint} (${durationMs}ms)`,
      source: "network",
      context: { endpoint, durationMs },
    });
  },
};

// Global error handlers
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (event.error) {
      telemetry.reportError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    telemetry.reportError(event.reason || "Unhandled Promise Rejection", {
      type: "unhandledrejection",
    });
  });
}
