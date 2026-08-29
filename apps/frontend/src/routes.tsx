import type { RouteObject } from "react-router-dom";
import PlaceholderPage from "./pages/PlaceholderPage";
import StatesDemoPage from "./pages/StatesDemoPage";

export const routes: RouteObject[] = [
  { path: "/login", element: <PlaceholderPage title="Login" phase="Phase 2" /> },
  { path: "/register", element: <PlaceholderPage title="Register" phase="Phase 2" /> },
  //   { path: "/dashboard", element: <PlaceholderPage title="Dashboard" phase="Phase 6" /> },
  { path: "/dashboard", element: <StatesDemoPage /> },
  { path: "/products", element: <PlaceholderPage title="Products" phase="Phase 3" /> },
  { path: "/products/:id", element: <PlaceholderPage title="Product Detail" phase="Phase 3" /> },
  { path: "/inventory", element: <PlaceholderPage title="Inventory" phase="Phase 4" /> },
  {
    path: "/inventory/at-risk",
    element: <PlaceholderPage title="Inventory At Risk" phase="Phase 4" />,
  },
  { path: "/sales", element: <PlaceholderPage title="Sales" phase="Phase 5" /> },
  { path: "/import", element: <PlaceholderPage title="Import" phase="Phase 5" /> },
  { path: "/forecasts", element: <PlaceholderPage title="Forecasts" phase="Phase 11" /> },
  {
    path: "/forecasts/:productId",
    element: <PlaceholderPage title="Forecast Detail" phase="Phase 11" />,
  },
  { path: "/stockout-risks", element: <PlaceholderPage title="Stockout Risks" phase="Phase 12" /> },
  { path: "/dead-stock", element: <PlaceholderPage title="Dead Stock" phase="Phase 9" /> },
  {
    path: "/reorder-recommendations",
    element: <PlaceholderPage title="Reorder Recommendations" phase="Phase 8" />,
  },
  { path: "/anomalies", element: <PlaceholderPage title="Anomalies" phase="Phase 13" /> },
  { path: "/simulator", element: <PlaceholderPage title="Simulator" phase="Phase 14" /> },
  { path: "/ai-assistant", element: <PlaceholderPage title="AI Assistant" phase="Phase 16" /> },
  { path: "/notifications", element: <PlaceholderPage title="Notifications" phase="Phase 15" /> },
  { path: "/settings", element: <PlaceholderPage title="Settings" phase="Phase 2" /> },
];
