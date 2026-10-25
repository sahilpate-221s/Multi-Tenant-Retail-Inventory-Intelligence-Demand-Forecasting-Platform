import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProductsListPage = lazy(() => import("./pages/ProductsListPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const BulkRestockPage = lazy(() => import("./pages/BulkRestockPage"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/PurchaseOrdersPage"));
const AtRiskInventoryPage = lazy(() => import("./pages/AtRiskInventoryPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const ImportDetailPage = lazy(() => import("./pages/ImportDetailPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const ForecastsListPage = lazy(() => import("./pages/ForecastsListPage"));
const ForecastDetailPage = lazy(() => import("./pages/ForecastDetailPage"));
const StockoutRisksPage = lazy(() => import("./pages/StockoutRisksPage"));
const DeadStockPage = lazy(() => import("./pages/DeadStockPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const AnomaliesPage = lazy(() => import("./pages/AnomaliesPage"));
const SimulatorPage = lazy(() => import("./pages/SimulatorPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const CustomerKhataPage = lazy(() => import("./pages/CustomerKhataPage"));
const VendorKhataPage = lazy(() => import("./pages/VendorKhataPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PosPage = lazy(() => import("./pages/PosPage"));
const PerishablesPage = lazy(() => import("./pages/PerishablesPage"));
const StockAuditPage = lazy(() => import("./pages/StockAuditPage"));

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <AuthPage /> },
  { path: "/register", element: <AuthPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/pos", element: <PosPage /> },
  { path: "/perishables", element: <PerishablesPage /> },
  { path: "/audits", element: <StockAuditPage /> },
  { path: "/products", element: <ProductsListPage /> },
  { path: "/products/:id", element: <ProductDetailPage /> },
  { path: "/inventory", element: <InventoryPage /> },
  { path: "/inventory/audit", element: <StockAuditPage /> },
  { path: "/inventory/bulk-restock", element: <BulkRestockPage /> },
  { path: "/suppliers", element: <SuppliersPage /> },
  { path: "/purchase-orders", element: <PurchaseOrdersPage /> },
  { path: "/inventory/at-risk", element: <AtRiskInventoryPage /> },
  { path: "/import", element: <ImportPage /> },
  { path: "/import/:id", element: <ImportDetailPage /> },
  { path: "/sales", element: <SalesPage /> },
  { path: "/khata", element: <CustomerKhataPage /> },
  { path: "/vendor-khata", element: <VendorKhataPage /> },
  { path: "/forecasts", element: <ForecastsListPage /> },
  { path: "/forecasts/:productId", element: <ForecastDetailPage /> },
  { path: "/stockout-risks", element: <StockoutRisksPage /> },
  { path: "/dead-stock", element: <DeadStockPage /> },
  { path: "/reorder-recommendations", element: <RecommendationsPage /> },
  { path: "/anomalies", element: <AnomaliesPage /> },
  { path: "/simulator", element: <SimulatorPage /> },
  { path: "/ai-assistant", element: <AIAssistantPage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/settings", element: <SettingsPage /> },
];

