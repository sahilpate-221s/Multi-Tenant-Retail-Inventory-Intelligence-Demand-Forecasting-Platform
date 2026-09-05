import type { RouteObject } from "react-router-dom";
import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductsListPage from "./pages/ProductsListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SuppliersPage from "./pages/SuppliersPage";
import InventoryPage from "./pages/InventoryPage";
import ImportPage from "./pages/ImportPage";
import ImportDetailPage from "./pages/ImportDetailPage";
import DashboardPage from "./pages/DashboardPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import DeadStockPage from "./pages/DeadStockPage";
import ForecastsListPage from "./pages/ForecastsListPage";
import ForecastDetailPage from "./pages/ForecastDetailPage";




export const routes: RouteObject[] = [
 { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/products", element: <ProductsListPage /> },
  { path: "/products/:id", element: <ProductDetailPage /> },

  { path: "/inventory", element: <InventoryPage /> },
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
  { path: "/stockout-risks", element: <PlaceholderPage title="Stockout Risks" phase="Phase 12" /> },
  { path: "/dead-stock", element: <DeadStockPage /> },
  { path: "/reorder-recommendations", element: <RecommendationsPage /> },
  { path: "/anomalies", element: <PlaceholderPage title="Anomalies" phase="Phase 13" /> },
  { path: "/simulator", element: <PlaceholderPage title="Simulator" phase="Phase 14" /> },
  { path: "/ai-assistant", element: <PlaceholderPage title="AI Assistant" phase="Phase 16" /> },
  { path: "/notifications", element: <PlaceholderPage title="Notifications" phase="Phase 15" /> },
  { path: "/settings", element: <PlaceholderPage title="Settings" phase="Phase 2" /> },
];
