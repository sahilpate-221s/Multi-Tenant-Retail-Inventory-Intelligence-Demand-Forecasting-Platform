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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
// app.use(cors());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "stockpilot-backend",
    timestamp: new Date().toISOString(),
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/stores", storesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/imports", importsRoutes);

app.listen(PORT, () => {
  console.log(`StockPilot backend running on http://localhost:${PORT}`);
});
