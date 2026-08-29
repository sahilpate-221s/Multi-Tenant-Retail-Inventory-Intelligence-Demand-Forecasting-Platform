import { useRoutes, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { routes } from "./routes";

const { authRoutes, appRoutes } = routes.reduce<{
  authRoutes: typeof routes;
  appRoutes: typeof routes;
}>(
  (acc, route) => {
    if (route.path === "/login" || route.path === "/register") {
      acc.authRoutes.push(route);
    } else {
      acc.appRoutes.push(route);
    }
    return acc;
  },
  { authRoutes: [], appRoutes: [] },
);

function App() {
  const element = useRoutes([
    ...authRoutes,
    {
      element: <AppLayout />,
      children: appRoutes,
    },
    { path: "/", element: <Navigate to="/dashboard" replace /> },
    { path: "*", element: <div className="p-8">404 — Page not found</div> },
  ]);

  return element;
}

export default App;