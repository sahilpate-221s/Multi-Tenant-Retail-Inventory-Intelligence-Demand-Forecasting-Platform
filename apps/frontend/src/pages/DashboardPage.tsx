import { useState, useRef, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { useDashboard } from "../hooks/useDashboard";
import HeroKPI from "../components/dashboard/HeroKPI";
import MetricTile from "../components/dashboard/MetricTile";
import MoverPanel from "../components/dashboard/MoverPanel";
import CategoryChart from "../components/dashboard/CategoryChart";
import ScrollReveal from "../components/motion/ScrollReveal";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

import { checkPrefersReducedMotion } from "../lib/motionUtils";
import DashboardShell from "../components/layout/DashboardShell";
import AdvancedAnalyticsSection from "../components/dashboard/AdvancedAnalyticsSection";
import RevenueTrendChart from "../components/dashboard/RevenueTrendChart";
import MorningBriefingCard, { getTimeGreeting } from "../components/dashboard/MorningBriefingCard";
import { useAuth } from "../lib/authContext";
import { useStoreSettings } from "../hooks/useSettings";

// Lazy-load the heavy 3D scene
const InventoryScene = lazy(
  () => import("../components/3d/InventoryScene")
);

const PERIODS = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useDashboard(days);
  const { user } = useAuth();
  const { data: store } = useStoreSettings();

  const userDisplayName = user?.email?.split("@")[0] || "";
  const storeDisplayName = store?.name || "";

  // Time-based greeting (Morning, Afternoon, Evening, Night)
  const timeInfo = useMemo(() => getTimeGreeting(), []);

  const POPUP_COOLDOWN_MS = 60 * 60 * 1000; // 1 Hour Cooldown between auto-popups

  // Popup state: Only comes once every hour (not on every refresh)
  const [showAutoPopup, setShowAutoPopup] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const lastShown = localStorage.getItem("sp_last_digest_popup_time");
      if (!lastShown) return true;
      const elapsed = Date.now() - Number(lastShown);
      return elapsed >= POPUP_COOLDOWN_MS;
    } catch {
      return true;
    }
  });
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  useEffect(() => {
    if (showAutoPopup) {
      try {
        localStorage.setItem("sp_last_digest_popup_time", String(Date.now()));
      } catch {}

      const timer = setTimeout(() => {
        setShowAutoPopup(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showAutoPopup]);

  // ─── Scroll tracking ───
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    setScrollProgress(Math.min(el.scrollTop / (maxScroll * 0.5), 1));
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Find the scrollable parent (main element in AppLayout)
    const scrollParent = el.closest("main");
    if (!scrollParent) return;

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ─── Mouse tracking (simplified, spring physics in scene) ───
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (checkPrefersReducedMotion()) return;

    function onMouseMove(e: MouseEvent) {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      });
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <DashboardShell ref={scrollContainerRef}>
      {/* ─── 5-6 SECOND FLOATING TOAST POPUP (DOES NOT BLOCK 3D SCENE) ─── */}
      {showAutoPopup && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="rounded-2xl bg-[#0c0c0e]/30 hover:bg-[#0c0c0e]/45 backdrop-blur-md border border-[#d4a853]/35 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(212,168,83,0.1)] p-4 relative overflow-hidden font-mono transition-colors">
            {/* 6-Second Auto-dismiss Progress Bar */}
            <div
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] transition-all duration-[6000ms] ease-linear w-0"
              style={{ width: "100%", animation: "shrinkWidth 6s linear forwards" }}
            />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#d4a853]/15 border border-[#d4a853]/30 flex items-center justify-center text-lg shrink-0">
                  {timeInfo.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#f5cf7b] capitalize">
                      {timeInfo.greeting}{userDisplayName ? `, ${userDisplayName}` : ""}! Welcome to {storeDisplayName || "StockPilot"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#97979d] line-clamp-1 mt-0.5">
                    Daily operations ready: Resolve stockouts & review incoming shipments.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowAutoPopup(false);
                    setShowBriefingModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e8be66] transition-all active:scale-95 shadow-sm"
                >
                  View Digest
                </button>
                <button
                  onClick={() => setShowAutoPopup(false)}
                  className="p-1 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/10 transition-colors"
                  title="Dismiss popup"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL BRIEFING MODAL (TRIGGERED ON DEMAND) ─── */}
      {showBriefingModal && (
        <MorningBriefingCard
          dashboardData={data}
          currencySymbol="₹"
          isModal
          onClose={() => setShowBriefingModal(false)}
        />
      )}

      {/* ─── TOP SECTION: Label + Header + Quick Digest Trigger + Period Selector ─── */}
      <div className="px-8 pt-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p
            className="sp-label"
            style={{ fontSize: "0.5625rem", letterSpacing: "0.14em" }}
          >
            INVENTORY INTELLIGENCE / OVERVIEW
          </p>
          <h1
            aria-label="Dashboard"
            className="mt-2 text-xl font-semibold tracking-tight"
            style={{ color: "var(--color-sp-text-primary)" }}
          >
            Know what moves.{" "}
            <span style={{ color: "var(--color-sp-text-muted)" }}>
              Know what matters.
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Operations Digest Trigger Button */}
          <button
            onClick={() => setShowBriefingModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#f5cf7b] bg-[#1a1812] hover:bg-[#252218] border border-[#d4a853]/40 transition-all shadow-sm active:scale-95 group"
            title="Open Store Operations Digest"
          >
            <span>{timeInfo.icon}</span>
            <span>Operations Digest</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse" />
          </button>

          {/* Period Selector */}
          <div className="flex gap-1 p-1 rounded-lg sp-glass border border-[rgba(255,255,255,0.1)]">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className="text-xs px-3.5 py-1.5 sp-font-mono transition-all duration-200 rounded font-medium"
                style={{
                  background:
                    days === p.value
                      ? "rgba(212, 168, 83, 0.18)"
                      : "transparent",
                  color:
                    days === p.value
                      ? "var(--color-sp-accent)"
                      : "var(--color-sp-text-muted)",
                  border:
                    days === p.value
                      ? "1px solid rgba(212, 168, 83, 0.4)"
                      : "1px solid transparent",
                  boxShadow:
                    days === p.value
                      ? "0 0 16px rgba(212, 168, 83, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                      : "none",
                  letterSpacing: "0.04em",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── LOADING / ERROR ─── */}
      {isLoading && (
        <div className="px-8 mt-4">
          <LoadingState message="Loading dashboard..." />
        </div>
      )}
      {isError && (
        <div className="px-8 mt-4">
          <ErrorState onRetry={() => refetch()} />
        </div>
      )}

      {data && (
        <>
          {/* ─── 3D SCENE + HERO KPI (PROUDLY UNBLOCKED & FRONT-AND-CENTER) ─── */}
          <div className="px-8 mt-4 relative">
            <Suspense
              fallback={
                <div
                  className="w-full rounded-lg"
                  style={{
                    height: "420px",
                    background:
                      "linear-gradient(180deg, var(--color-sp-elevated) 0%, var(--color-sp-base) 100%)",
                  }}
                />
              }
            >
              <InventoryScene
                mouseX={mousePos.x}
                mouseY={mousePos.y}
                scrollProgress={scrollProgress}
                fastMoverCount={data.fastMovers.length}
                slowMoverCount={data.slowMovers.length}
              />
            </Suspense>

            {/* Floating KPI overlay */}
            <div
              className="absolute bottom-12 left-12"
              style={{
                opacity: Math.max(0, 1 - scrollProgress * 2),
                transform: `translateY(${scrollProgress * -20}px)`,
                transition: "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <HeroKPI revenue={data.totalRevenue} days={days} unitsSold={data.unitsSold} />
            </div>
          </div>

          {/* ─── SUPPORTING METRICS ─── */}
          <ScrollReveal className="px-8 mt-6" delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricTile
                label="UNITS SOLD"
                value={data.unitsSold}
              />
              <MetricTile
                label="INVENTORY VALUE"
                value={data.inventoryValue}
                format={formatCurrency}
              />
              <MetricTile
                label="TURNOVER RATIO"
                value={data.turnoverRatio ?? 0}
                format={(n) => (n > 0 ? n.toFixed(2) : "—")}
                sublabel="COGS ÷ inventory value"
              />
            </div>
          </ScrollReveal>

          {/* ─── REVENUE & SALES TRAJECTORY TREND CHART ─── */}
          <ScrollReveal className="px-8 mt-8" delay={150}>
            <RevenueTrendChart
              dailySales={data.dailySales}
              monthlyTrends={data.monthlyTrends}
              currencySymbol="₹"
            />
          </ScrollReveal>

          {/* ─── CATEGORY PERFORMANCE ─── */}
          <ScrollReveal className="px-8 mt-8" delay={200}>
            <div className="sp-glass-elevated rounded-xl overflow-hidden">
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: "var(--color-sp-accent)",
                      boxShadow: "0 0 10px rgba(212, 168, 83, 0.5)",
                    }}
                  />
                  <span className="sp-label" style={{ fontSize: "0.625rem" }}>
                    CATEGORY PERFORMANCE
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#5c5c64]">
                  DYNAMIC VECTOR STREAM
                </span>
              </div>
              <div className="p-6">
                <CategoryChart data={data.categoryPerformance} />
              </div>
            </div>
          </ScrollReveal>

          {/* ─── FAST / SLOW MOVERS ─── */}
          <ScrollReveal className="px-8 mt-6" delay={300}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MoverPanel type="fast" items={data.fastMovers} />
              <MoverPanel type="slow" items={data.slowMovers} />
            </div>
          </ScrollReveal>

          {/* ─── ADVANCED ANALYTICS & CAPITAL EFFICIENCY ─── */}
          <ScrollReveal className="px-8 mt-8 pb-16" delay={400}>
            <AdvancedAnalyticsSection />
          </ScrollReveal>
        </>
      )}
    </DashboardShell>
  );
}

export default DashboardPage;