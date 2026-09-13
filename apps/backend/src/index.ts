import express from "express";
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
import aiRoutes from "./modules/ai/ai.routes";
import auditRoutes from "./modules/audit/audit.routes";
import { authRateLimiter, aiRateLimiter, generalRateLimiter } from "./middleware/rateLimiters";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind's runtime injects inline styles in dev
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "stockpilot-backend",
    timestamp: new Date().toISOString(),
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

app.listen(PORT, () => {
  console.log(`StockPilot backend running on http://localhost:${PORT}`);
});
