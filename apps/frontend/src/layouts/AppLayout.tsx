import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Products" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/import", label: "Import" },
  { to: "/forecasts", label: "Forecasts" },
  { to: "/stockout-risks", label: "Stockout Risks" },
  { to: "/reorder-recommendations", label: "Reorder Recommendations" },
  { to: "/dead-stock", label: "Dead Stock" },
  { to: "/anomalies", label: "Anomalies" },
  { to: "/simulator", label: "Simulator" },
  { to: "/ai-assistant", label: "AI Assistant" },
  { to: "/notifications", label: "Notifications" },
  { to: "/settings", label: "Settings" },
];

function AppLayout() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="h-14 flex items-center px-4 border-b border-slate-200">
          <span className="font-semibold text-slate-800">StockPilot</span>
        </div>
        <nav className="p-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
          <span className="text-sm text-slate-500">Small Grocery Store Demo</span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-status-success-bg text-status-success">
            System Healthy
          </span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
