import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { routes } from "./routes";
import ProtectedRoute from "./components/ProtectedRoute";

const { authRoutes, appRoutes } = routes.reduce<{
  authRoutes: typeof routes;
  appRoutes: typeof routes;
}>(
  (acc, route) => {
    if (route.path === "/login" || route.path === "/register" || route.path === "/") {
      acc.authRoutes.push(route);
    } else {
      acc.appRoutes.push(route);
    }
    return acc;
  },
  { authRoutes: [], appRoutes: [] },
);

function PageLoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0c0c0e]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#d4a853] border-t-transparent animate-spin" />
        <span className="text-[11px] font-mono tracking-widest uppercase text-[#97979d]">
          Loading StockPilot...
        </span>
      </div>
    </div>
  );
}

function App() {
  const element = useRoutes([
    ...authRoutes,
    {
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: appRoutes,
    },
    { path: "*", element: <div className="p-8 text-[#97979d]">404 — Page not found</div> },
  ]);

  return <Suspense fallback={<PageLoadingFallback />}>{element}</Suspense>;
}

export default App;