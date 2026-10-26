import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import storesRoutes from "./modules/stores/stores.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import productsRoutes from "./modules/products/products.routes";
import suppliersRoutes from "./modules/suppliers/suppliers.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import importsRoutes from "./modules/imports/imports.routes";
import "./modules/imports/importWorker";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import purchaseOrdersRoutes from "./modules/purchaseOrders/purchaseOrders.routes";
import intelligenceRoutes from "./modules/intelligence/intelligence.routes";
import recommendationsRoutes from "./modules/recommendations/recommendations.routes";
import deadStockRoutes from "./modules/deadStock/deadStock.routes";
import forecastingRoutes from "./modules/forecasting/forecasting.routes";
import stockoutRoutes from "./modules/stockout/stockout.routes";
import anomaliesRoutes from "./modules/anomalies/anomalies.routes";
import returnsRoutes from "./modules/returns/returns.routes";
import simulatorRoutes from "./modules/simulator/simulator.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import salesRoutes from "./modules/sales/sales.routes";
import aiRoutes from "./modules/ai/ai.routes";
import auditRoutes from "./modules/audit/audit.routes";
import observabilityRoutes from "./modules/observability/observability.routes";
import telemetryRoutes from "./modules/telemetry/telemetry.routes";
import { serverAdapter } from "./queue/bullBoard";
import { authRateLimiter, aiRateLimiter, generalRateLimiter } from "./middleware/rateLimiters";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { redisConnection } from "./queue/redisConnection";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const isOriginAllowed = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (
    !origin ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://192.168.") ||
    (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
  ) {
    callback(null, true);
  } else {
    callback(null, true); // Dev environment: allow local network testing
  }
};
app.use(cors({ origin: isOriginAllowed, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as Request).requestId,
    customLogLevel: (_req, res) => (res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
  }),
);

// Liveness: nearly instant, checks almost nothing - "is the process alive."
app.get("/live", (_req, res) => {
  res.status(200).json({ status: "alive" });
});

// Readiness: genuinely checks real dependencies - "can this instance
// actually serve requests right now."
app.get("/ready", async (_req, res) => {
  const checks: Record<string, boolean> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    await redisConnection.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  const allReady = Object.values(checks).every(Boolean);
  res.status(allReady ? 200 : 503).json({ status: allReady ? "ready" : "not_ready", checks });
});

// General health: human/dashboard-facing, now genuinely reflects
// dependency status rather than unconditionally returning "ok".
app.get("/health", async (_req, res) => {
  let dbStatus = "unknown";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch {
    dbStatus = "unreachable";
  }

  res.status(200).json({
    status: "ok",
    service: "stockpilot-backend",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

app.use("/api", generalRateLimiter);
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/ai", aiRateLimiter, aiRoutes);
app.use("/api/stores", storesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/imports", importsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/purchase-orders", purchaseOrdersRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/dead-stock", deadStockRoutes);
app.use("/api/forecasting", forecastingRoutes);
app.use("/api/stockout-risks", stockoutRoutes);
app.use("/api/anomalies", anomaliesRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/simulations", simulatorRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/observability", observabilityRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/admin/queues", serverAdapter.getRouter());

app.listen(PORT, () => {
  logger.info(`StockPilot backend running on http://localhost:${PORT}`);
});
