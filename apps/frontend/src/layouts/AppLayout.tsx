import { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import NotificationBell from "../components/notifications/NotificationBell";
import AmbientBackground from "../components/layout/AmbientBackground";

const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;

const navSections = [
  {
    label: "CORE",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/products", label: "Products" },
      { to: "/inventory", label: "Inventory" },
      { to: "/suppliers", label: "Suppliers" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { to: "/sales", label: "Sales" },
      { to: "/import", label: "Import" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/forecasts", label: "Forecasts" },
      { to: "/stockout-risks", label: "Stockout Risk" },
      { to: "/reorder-recommendations", label: "Reorder" },
      { to: "/dead-stock", label: "Dead Stock" },
      { to: "/anomalies", label: "Anomalies" },
      { to: "/simulator", label: "Simulator" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { to: "/ai-assistant", label: "AI Assistant" },
      { to: "/notifications", label: "Notifications" },
      { to: "/settings", label: "Settings" },
    ],
  },
];

function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
    const saved = localStorage.getItem("sp_sidebar_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.min(
          Math.max(startWidth + delta, MIN_SIDEBAR_WIDTH),
          MAX_SIDEBAR_WIDTH
        );
        setSidebarWidth(newWidth);
      };

      const onPointerUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [sidebarWidth]
  );

  useEffect(() => {
    try {
      localStorage.setItem("sp_sidebar_width", String(sidebarWidth));
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  // Derive display name or initials from user email
  const userInitial = (user?.email?.[0] || "U").toUpperCase();
  const userDisplayName = user?.email?.split("@")[0] || "Operator";

  return (
    <div
      className="h-screen w-screen overflow-hidden flex"
      style={{ background: "var(--color-sp-base)" }}
    >
      {/* ─── SIDEBAR (INDEPENDENT SCROLLING CONTAINER — NO FOOTER) ─── */}
      <aside
        className="h-full relative shrink-0 flex flex-col select-none overflow-hidden sp-glass z-20"
        style={{
          width: `${sidebarWidth}px`,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          transition: isDragging ? "none" : "width 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Drag Resizer Handle */}
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={() => {
            setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
            localStorage.setItem("sp_sidebar_width", String(DEFAULT_SIDEBAR_WIDTH));
          }}
          title="Drag to resize sidebar (Double-click to reset)"
          className="absolute top-0 right-0 bottom-0 w-2 translate-x-1 cursor-col-resize z-30 group flex items-center justify-center select-none"
        >
          <div
            className={`w-0.5 h-full transition-colors ${
              isDragging ? "bg-[#d4a853]" : "bg-transparent group-hover:bg-[#d4a853]/60"
            }`}
          />
        </div>

        {/* Wordmark Header */}
        <div
          className="h-14 shrink-0 flex items-center px-5 gap-1.5"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <span
            className="text-sm font-bold tracking-widest"
            style={{ color: "var(--color-sp-text-primary)" }}
          >
            STOCK
          </span>
          <span
            className="text-sm font-bold tracking-widest"
            style={{ color: "var(--color-sp-accent)" }}
          >
            PILOT
          </span>
          <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(212,168,83,0.12)] text-[#d4a853] border border-[rgba(212,168,83,0.25)]">
            v2.4
          </span>
        </div>

        {/* Navigation (Independently scrollable up and down) */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p
                className="px-2 mb-1"
                style={{
                  fontSize: "0.5625rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "var(--color-sp-text-ghost)",
                  textTransform: "uppercase",
                }}
              >
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="block relative rounded-md"
                    style={({ isActive }) => ({
                      padding: "7px 10px",
                      fontSize: "0.8125rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? "var(--color-sp-text-primary)"
                        : "var(--color-sp-text-secondary)",
                      background: isActive
                        ? "rgba(212, 168, 83, 0.14)"
                        : "transparent",
                      borderLeft: isActive
                        ? "2px solid var(--color-sp-accent)"
                        : "2px solid transparent",
                      boxShadow: isActive
                        ? "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0,0,0,0.25)"
                        : "none",
                      transition: "all 150ms ease",
                    })}
                    onMouseOver={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ─── MAIN AREA (INDEPENDENT SCROLLING VIEWPORT — NO FOOTER) ─── */}
      <div className="h-full flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Sleek High-End Frosted Glass Navbar */}
        <header
          className="h-14 shrink-0 flex items-center justify-between px-6 z-30 sp-glass"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Left: Facility & Breadcrumb Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#e8e6e3]">
                MAIN DISTRIBUTION HUB
              </span>
            </div>
            <span className="text-[#303035] hidden sm:inline">•</span>
            <span className="text-[11px] font-mono text-[#97979d] hidden sm:inline">
              SECTOR 04-A
            </span>
          </div>

          {/* Right: Command Bar + Notification + Modern Profile Bar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            {/* Modern User Profile & Logout Strip */}
            <div className="flex items-center gap-3 pl-3 border-l border-[rgba(255,255,255,0.08)]">
              {/* User Avatar + Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a853] to-[#8c6b2d] flex items-center justify-center text-xs font-bold text-[#0c0c0e] shadow-[0_0_12px_rgba(212,168,83,0.3)]">
                  {userInitial}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-semibold text-[#e8e6e3] leading-none">
                    {userDisplayName}
                  </span>
                  <span className="text-[10px] font-mono text-[#97979d] mt-1 leading-none truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Refined Logout Button */}
              <button
                onClick={async () => {
                  try {
                    await logout();
                  } finally {
                    navigate("/", { replace: true });
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#97979d] hover:text-[#d4a853] bg-[#1a1a22] hover:bg-[#23232d] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(212,168,83,0.3)] transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Log out from StockPilot and return to home"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Independently Scrollable Main Viewport (With subtle living background animation & NO footer) */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain relative flex flex-col"
          style={{ background: "var(--color-sp-base)" }}
        >
          {/* Classy Ambient Background Animation for all internal pages */}
          <AmbientBackground />

          {/* Page Content Viewport */}
          <div className="relative z-10 flex-1 min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
