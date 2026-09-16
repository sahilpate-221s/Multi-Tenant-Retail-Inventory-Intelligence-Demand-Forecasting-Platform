import type { RouteObject } from "react-router-dom";
import PlaceholderPage from "./pages/PlaceholderPage";
import ProductsListPage from "./pages/ProductsListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SuppliersPage from "./pages/SuppliersPage";
import InventoryPage from "./pages/InventoryPage";
import BulkRestockPage from "./pages/BulkRestockPage";
import ImportPage from "./pages/ImportPage";
import ImportDetailPage from "./pages/ImportDetailPage";
import DashboardPage from "./pages/DashboardPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import DeadStockPage from "./pages/DeadStockPage";
import ForecastsListPage from "./pages/ForecastsListPage";
import ForecastDetailPage from "./pages/ForecastDetailPage";
import StockoutRisksPage from "./pages/StockoutRisksPage";
import AnomaliesPage from "./pages/AnomaliesPage";
import SimulatorPage from "./pages/SimulatorPage";
import NotificationsPage from "./pages/NotificationsPage";
import AIAssistantPage from "./pages/AIAssistantPage";






import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <AuthPage /> },
  { path: "/register", element: <AuthPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/products", element: <ProductsListPage /> },
  { path: "/products/:id", element: <ProductDetailPage /> },

  { path: "/inventory", element: <InventoryPage /> },
  { path: "/inventory/bulk-restock", element: <BulkRestockPage /> },
  { path: "/suppliers", element: <SuppliersPage /> },

  {
    path: "/inventory/at-risk",
    element: <PlaceholderPage title="Inventory At Risk" phase="Phase 4" />,
  },
  { path: "/import", element: <ImportPage /> },
  { path: "/import/:id", element: <ImportDetailPage /> },

  { path: "/sales", element: <PlaceholderPage title="Sales" phase="Phase 5" /> },
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
