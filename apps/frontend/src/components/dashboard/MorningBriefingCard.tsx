import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useStockoutRisks } from "../../hooks/useStockoutRisks";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";
import { getExpiringBatches } from "../../lib/batchExpiryStorage";
import type { DashboardData } from "../../lib/types";

export interface TimeGreetingInfo {
  greeting: string;
  icon: string;
  title: string;
  subtitle: string;
}

export function getTimeGreeting(): TimeGreetingInfo {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good Morning",
      icon: "🌅",
      title: "Morning Command Center — Store Operations Digest",
      subtitle: "Daily critical priorities: Resolve stockouts, verify incoming shipments, and inspect shelves.",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good Afternoon",
      icon: "☀️",
      title: "Afternoon Command Center — Mid-Day Operations Digest",
      subtitle: "Mid-day priorities: Check peak afternoon velocity, replenish fast movers, and verify deliveries.",
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      greeting: "Good Evening",
      icon: "🌇",
      title: "Evening Command Center — Closing Operations Digest",
      subtitle: "Evening priorities: Reconcile counter sales, review expiring batches, and prep tomorrow's reorders.",
    };
  } else {
    return {
      greeting: "Good Night",
      icon: "🌙",
      title: "Night Command Center — Off-Hours Operations Digest",
      subtitle: "Off-hours operations: Review today's gross turnover, audit safety stock, and plan morning deliveries.",
    };
  }
}

interface Props {
  dashboardData?: DashboardData;
  currencySymbol?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export function MorningBriefingCard({
  dashboardData,
  currencySymbol = "₹",
  isModal = false,
  onClose,
}: Props) {
  const { data: risks } = useStockoutRisks();
  const { data: purchaseOrders } = usePurchaseOrders();
  const storeId = localStorage.getItem("stockpilot_store_id") || "default";

  const [expiringBatches, setExpiringBatches] = useState(() => getExpiringBatches(storeId, 7));

  useEffect(() => {
    const handleUpdate = () => {
      setExpiringBatches(getExpiringBatches(storeId, 7));
    };
    window.addEventListener("batches-updated", handleUpdate);
    return () => window.removeEventListener("batches-updated", handleUpdate);
  }, [storeId]);

  const timeInfo = useMemo(() => getTimeGreeting(), []);

  const criticalRisks = (risks || []).filter(
    (r) => r.riskLevel === "critical" || r.riskLevel === "high"
  );

  const today = new Date().toISOString().split("T")[0];
  const arrivingOrders = (purchaseOrders || []).filter(
    (po) => po.status === "pending" && po.expectedArrivalDate <= today
  );

  const topMover = dashboardData?.fastMovers?.[0];

  const cardContent = (
    <div className={`rounded-2xl bg-gradient-to-br from-[#161620] via-[#121218] to-[#0d0d12] border border-[#d4a853]/25 p-5 md:p-6 shadow-[0_0_30px_rgba(212,168,83,0.08)] font-mono select-none ${isModal ? "max-w-4xl w-full max-h-[85vh] overflow-y-auto" : ""}`}>
      {/* ─── Briefing Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4a853] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4a853]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#d4a853] uppercase tracking-wider">
                {timeInfo.greeting}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-[10px] text-[#71717a]">
                {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <h2 className="text-sm font-bold text-[#f4f4f5] tracking-tight mt-0.5">
              {timeInfo.icon} {timeInfo.title}
            </h2>
            <p className="text-[11px] text-[#97979d] mt-0.5">
              {timeInfo.subtitle}
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs text-[#97979d] hover:text-[#f4f4f5] hover:bg-white/10 transition-colors"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* ─── Perishables / Expiry Alert Banner (if any) ─── */}
      {expiringBatches.length > 0 && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#d45a4a]/10 border border-[#d45a4a]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-base shrink-0 mt-0.5 sm:mt-0">⏳</span>
            <div>
              <p className="text-xs font-bold text-[#d45a4a]">
                Perishable Expiry Alert: {expiringBatches.length} batch(es) nearing expiration within 7 days
              </p>
              <div className="text-[11px] text-[#e8e6e3] mt-1 flex flex-wrap gap-2">
                {expiringBatches.slice(0, 3).map((b) => (
                  <span key={b.id} className="bg-black/40 px-2 py-0.5 rounded border border-white/8 text-[10px]">
                    <strong className="text-[#f4f4f5]">{b.productName}</strong> (Batch: {b.batchNumber}) —{" "}
                    <span className="text-[#d45a4a] font-bold">
                      {b.daysRemaining <= 0 ? "EXPIRES TODAY" : `${b.daysRemaining}d left`}
                    </span>{" "}
                    ({b.quantity} units)
                  </span>
                ))}
                {expiringBatches.length > 3 && (
                  <span className="text-[#71717a] text-[10px] self-center">
                    +{expiringBatches.length - 3} more batches
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            to="/perishables"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#d45a4a] hover:bg-[#e06757] text-white text-xs font-bold shrink-0 self-start sm:self-center transition-all shadow-sm active:scale-95"
          >
            Inspect Batches →
          </Link>
        </div>
      )}

      {/* ─── 3 Immediate Action Columns ─── */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Critical Stockout Warnings */}
        <div className="p-4 rounded-xl bg-[#0b0b0f] border border-white/6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d45a4a] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d45a4a]" />
                Critical Restock Required
              </span>
              <span className="text-xs font-bold text-[#d45a4a] tabular-nums">
                {criticalRisks.length} SKU(s)
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {criticalRisks.length === 0 ? (
                <p className="text-xs text-[#4aba7a] py-2">
                  ✓ All safety stock buffers nominal. Zero immediate stockout risks.
                </p>
              ) : (
                criticalRisks.slice(0, 2).map((item) => (
                  <div key={item.id} className="text-xs flex items-center justify-between text-[#e8e6e3]">
                    <span className="truncate pr-2 font-medium">{item.productName}</span>
                    <span className="text-[11px] text-[#d45a4a] shrink-0 font-bold">
                      {item.currentStock} left ({Number(item.daysUntilStockout || 0).toFixed(1)}d)
                    </span>
                  </div>
                ))
              )}
              {criticalRisks.length > 2 && (
                <p className="text-[10px] text-[#71717a]">
                  + {criticalRisks.length - 2} more items reaching depletion threshold
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <Link
              to="/reorder-recommendations"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-lg bg-[#d4a853]/15 hover:bg-[#d4a853]/25 text-[#d4a853] border border-[#d4a853]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>⚡ Review AI Reorders ({criticalRisks.length})</span>
            </Link>
          </div>
        </div>

        {/* Column 2: Inbound Supplier Deliveries */}
        <div className="p-4 rounded-xl bg-[#0b0b0f] border border-white/6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                Inbound Deliveries
              </span>
              <span className="text-xs font-bold text-[#38bdf8] tabular-nums">
                {arrivingOrders.length} Expected
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {arrivingOrders.length === 0 ? (
                <p className="text-xs text-[#97979d] py-2">
                  No supplier shipments scheduled for delivery today.
                </p>
              ) : (
                arrivingOrders.slice(0, 2).map((po) => (
                  <div key={po.id} className="text-xs flex items-center justify-between text-[#e8e6e3]">
                    <span className="truncate pr-2 font-medium">
                      PO-{po.id.slice(0, 6).toUpperCase()} • {po.productName}
                    </span>
                    <span className="text-[11px] text-[#4aba7a] shrink-0 font-bold">
                      +{po.quantity} units
                    </span>
                  </div>
                ))
              )}
              {arrivingOrders.length > 2 && (
                <p className="text-[10px] text-[#71717a]">
                  + {arrivingOrders.length - 2} more shipments due
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <Link
              to="/purchase-orders"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-lg bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 text-[#38bdf8] border border-[#38bdf8]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>📥 Verify Inbound POs ({arrivingOrders.length})</span>
            </Link>
          </div>
        </div>

        {/* Column 3: Store Velocity & Register Health */}
        <div className="p-4 rounded-xl bg-[#0b0b0f] border border-white/6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4aba7a] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
                Store Velocity & Turnover
              </span>
              <span className="text-xs font-bold text-[#4aba7a] tabular-nums">
                Healthy
              </span>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between text-[#97979d]">
                <span>Period Revenue:</span>
                <strong className="text-[#f4f4f5]">
                  {currencySymbol}
                  {(dashboardData?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between text-[#97979d]">
                <span>Units Dispatched:</span>
                <strong className="text-[#f4f4f5]">
                  {(dashboardData?.unitsSold ?? 0).toLocaleString()} units
                </strong>
              </div>
              {topMover && (
                <div className="flex justify-between text-[#97979d] pt-1">
                  <span>Top Mover:</span>
                  <strong className="text-[#d4a853] truncate max-w-[150px]">
                    {topMover.productName}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            <Link
              to="/pos"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-lg bg-[#4aba7a]/15 hover:bg-[#4aba7a]/25 text-[#4aba7a] border border-[#4aba7a]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>⚡ Open Counter Billing →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

export default MorningBriefingCard;
