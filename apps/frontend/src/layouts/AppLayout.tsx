import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { useStoreSettings } from "../hooks/useSettings";
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
      { to: "/pos", label: "Counter Billing" },
      { to: "/sales", label: "Sales & Orders" },
      { to: "/perishables", label: "Expiry & Batches" },
      { to: "/audits", label: "Stock Audits" },
      { to: "/purchase-orders", label: "Purchase Orders" },
      { to: "/khata", label: "Customer Khata" },
      { to: "/vendor-khata", label: "Vendor Khata" },
      { to: "/import", label: "Import" },
      { to: "/inventory/bulk-restock", label: "Bulk Restock" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/inventory/at-risk", label: "At-Risk Sentinel" },
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
  const { data: store } = useStoreSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const isCashier = user?.role === "cashier";

  const displayedNavSections = useMemo(() => {
    if (!isCashier) return navSections;
    return [
      {
        label: "COUNTER OPERATIONS",
        items: [
          { to: "/pos", label: "Counter Billing" },
          { to: "/sales", label: "Past Sales Ledger" },
          { to: "/khata", label: "Customer Khata" },
        ],
      },
      {
        label: "STORE LOOKUP",
        items: [
          { to: "/inventory", label: "Shelf Stock Check" },
        ],
      },
      {
        label: "SYSTEM",
        items: [
          { to: "/notifications", label: "Notifications" },
        ],
      },
    ];
  }, [isCashier]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      {/* ─── DESKTOP SIDEBAR (HIDDEN ON MOBILE < 1024px) ─── */}
      <aside
        className="hidden lg:flex h-full relative shrink-0 flex-col select-none overflow-hidden sp-glass z-20"
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
          className="h-14 shrink-0 flex items-center px-4 gap-2.5"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          {/* Pilot Delta Wing Emblem */}
          <div
            className="w-7 h-7 relative shrink-0 flex items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, rgba(30,28,34,0.9), rgba(14,14,18,0.95))",
              border: "1px solid rgba(212,168,83,0.35)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 0 10px rgba(212,168,83,0.12)",
            }}
          >
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              <defs>
                <linearGradient id="app-gold-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fae099" />
                  <stop offset="60%" stopColor="#d4a853" />
                  <stop offset="100%" stopColor="#a37629" />
                </linearGradient>
                <linearGradient id="app-gold-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fae099" />
                  <stop offset="100%" stopColor="#d4a853" />
                </linearGradient>
              </defs>
              <path d="M16 5L6 23L16 19.5L16 5Z" fill="url(#app-gold-grad1)" opacity="0.88" />
              <path d="M16 5L26 23L16 19.5L16 5Z" fill="url(#app-gold-grad2)" />
              <path d="M16 8.5L19.2 19L16 17L12.8 19L16 8.5Z" fill="#ffffff" opacity="0.95" />
              <circle cx="16" cy="24.5" r="1.5" fill="#f5cf7b" />
            </svg>
          </div>
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
          {displayedNavSections.map((section) => (
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

      {/* ─── MOBILE SLIDE-OVER DRAWER (< 1024px) ─── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <aside
            className="relative w-[285px] max-w-[85vw] h-full bg-[#0c0c0e]/98 border-r border-white/10 flex flex-col z-10 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-[#121218]">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 relative shrink-0 flex items-center justify-center rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(30,28,34,0.9), rgba(14,14,18,0.95))",
                    border: "1px solid rgba(212,168,83,0.35)",
                  }}
                >
                  <span className="text-xs font-black text-[#d4a853]">SP</span>
                </div>
                <span className="text-sm font-bold tracking-widest text-[#f4f4f5]">STOCK</span>
                <span className="text-sm font-bold tracking-widest text-[#d4a853]">PILOT</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-[#97979d] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-3">
              {displayedNavSections.map((section) => (
                <div key={section.label} className="mb-4">
                  <p className="px-2 mb-1 text-[9px] font-bold text-[#71717a] uppercase tracking-wider">
                    {section.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? "bg-[#d4a853]/20 text-[#f5cf7b] border-l-2 border-[#d4a853] font-bold"
                              : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Store & User footer */}
            <div className="p-3 border-t border-white/10 bg-[#121218]/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-md bg-[#d4a853]/20 text-[#d4a853] flex items-center justify-center text-[10px] font-bold">
                  {userInitial}
                </div>
                <span className="text-white truncate font-medium">{store?.name || userDisplayName}</span>
              </div>
              <span className="text-[10px] font-mono text-[#71717a] uppercase">
                {isCashier ? "Cashier" : "Owner"}
              </span>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN AREA (INDEPENDENT SCROLLING VIEWPORT — NO FOOTER) ─── */}
      <div className="h-full flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Sleek High-End Frosted Glass Navbar */}
        <header
          className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 z-30 sp-glass"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Left: Mobile Hamburger Button + Store Name Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#d4a853] bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm">
              <div className="w-5 h-5 rounded-md bg-[#d4a853]/15 border border-[#d4a853]/30 flex items-center justify-center text-[#d4a853]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f4f4f5] tracking-wide">
                  {store?.name || "Apex Store"}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a] shadow-[0_0_8px_rgba(74,186,122,0.6)]" title="Store Connected" />
              </div>
            </div>
          </div>

          {/* Middle: Role Badge */}
          {isCashier ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-bold">
              <span>🛒 Cashier Counter View</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-semibold">
              <span>👑 Store Owner</span>
            </div>
          )}

          {/* Right: Notifications + Settings Dropdown Action Button */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Settings & Profile Menu */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setSettingsOpen((prev) => !prev)}
                id="nav-settings-dropdown-btn"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] bg-[#14141a] hover:bg-[#1c1c24] border border-white/10 hover:border-[#d4a853]/40 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Account & Session"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#d4a853] to-[#8c6b2d] flex items-center justify-center text-[10px] font-bold text-[#0c0c0e]">
                  {userInitial}
                </div>
                <span className="hidden sm:inline font-medium">
                  {isCashier ? "Cashier" : "Owner"}
                </span>
                <svg
                  className={`w-3 h-3 text-[#71717a] transition-transform duration-200 ${
                    settingsOpen ? "rotate-180 text-[#d4a853]" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Glassmorphic Dropdown */}
              {settingsOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#121218] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8)] p-2 z-50 backdrop-blur-2xl"
                  style={{
                    boxShadow: "0 20px 50px rgba(0,0,0,0.7), 0 0 25px rgba(212,168,83,0.1)",
                  }}
                >
                  {/* Account Summary Header */}
                  <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a853] to-[#8c6b2d] flex items-center justify-center text-xs font-bold text-[#0c0c0e] shrink-0 shadow-sm">
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#f4f4f5] truncate">
                        {store?.name || userDisplayName}
                      </div>
                      <div className="text-[10px] text-[#71717a] truncate mt-0.5">
                        {user?.email}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                            isCashier
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {isCashier ? "🛒 Cashier Account" : "👑 Owner (Full Access)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="py-1.5 space-y-0.5">
                    {!isCashier ? (
                      <>
                        <button
                          onClick={() => {
                            setSettingsOpen(false);
                            navigate("/settings");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#e8e6e3] hover:text-[#d4a853] hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-[#d4a853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1">
                            <div className="font-semibold">Settings</div>
                            <div className="text-[10px] text-[#71717a]">Store setup & credentials</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setSettingsOpen(false);
                            navigate("/settings?tab=team");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#e8e6e3] hover:text-[#d4a853] hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
                        >
                          <span className="text-sm">👥</span>
                          <div className="flex-1">
                            <div className="font-semibold">Staff & Cashiers</div>
                            <div className="text-[10px] text-[#71717a]">Manage cashier counter logins</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setSettingsOpen(false);
                            navigate("/settings?tab=inventory");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#e8e6e3] hover:text-[#d4a853] hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-[#4aba7a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <div className="flex-1">
                            <div className="font-semibold">Inventory Policies</div>
                            <div className="text-[10px] text-[#71717a]">Buffer days & auto-reorder rules</div>
                          </div>
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-[#97979d] bg-white/[0.02] rounded-xl border border-white/5">
                        <span className="text-amber-400 font-semibold block mb-0.5">🔒 Restricted Access</span>
                        Wholesale costs, margins & reports are protected by store owner.
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-white/5" />

                  {/* Logout Button */}
                  <button
                    onClick={async () => {
                      setSettingsOpen(false);
                      try {
                        await logout();
                      } finally {
                        navigate("/", { replace: true });
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#f87171] hover:bg-[#d45a4a]/10 transition-colors text-left group cursor-pointer"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Independently Scrollable Main Viewport (With subtle living background animation & NO footer) */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain relative flex flex-col pb-16 lg:pb-0"
          style={{ background: "var(--color-sp-base)" }}
        >
          {/* Classy Ambient Background Animation for all internal pages */}
          <AmbientBackground />

          {/* Page Content Viewport */}
          <div className="relative z-10 flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center">
                  <div className="w-7 h-7 rounded-full border-2 border-[#d4a853] border-t-transparent animate-spin" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* ─── SLEEK MOBILE BOTTOM QUICK BAR (< 1024px) ─── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around py-2 px-1 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <NavLink
            to="/pos"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? "text-[#d4a853]" : "text-[#71717a] hover:text-[#f4f4f5]"
              }`
            }
          >
            <span className="text-base">🛒</span>
            <span>Billing</span>
          </NavLink>

          <NavLink
            to={isCashier ? "/sales" : "/products"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? "text-[#d4a853]" : "text-[#71717a] hover:text-[#f4f4f5]"
              }`
            }
          >
            <span className="text-base">{isCashier ? "📜" : "📦"}</span>
            <span>{isCashier ? "Sales" : "Products"}</span>
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? "text-[#d4a853]" : "text-[#71717a] hover:text-[#f4f4f5]"
              }`
            }
          >
            <span className="text-base">📊</span>
            <span>Stock</span>
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? "text-[#d4a853]" : "text-[#71717a] hover:text-[#f4f4f5]"
              }`
            }
          >
            <span className="text-base">🔔</span>
            <span>Alerts</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-[#71717a] hover:text-[#f4f4f5] cursor-pointer"
          >
            <span className="text-base">☰</span>
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default AppLayout;
