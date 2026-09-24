import { useState } from "react";
import { Link } from "react-router-dom";
import { useStockoutRisks, useGenerateStockoutRisks } from "../hooks/useStockoutRisks";
import { useCreatePurchaseOrder } from "../hooks/usePurchaseOrders";
import type { StockoutPrediction } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import ExplainButton from "../components/ai/ExplainButton";

const RISK_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(212, 90, 74, 0.15)", text: "#d45a4a", border: "rgba(212, 90, 74, 0.3)" },
  high: { bg: "rgba(212, 168, 83, 0.15)", text: "#d4a853", border: "rgba(212, 168, 83, 0.3)" },
  moderate: { bg: "rgba(107, 140, 199, 0.15)", text: "#6b8cc7", border: "rgba(107, 140, 199, 0.3)" },
  low: { bg: "rgba(74, 186, 122, 0.15)", text: "#4aba7a", border: "rgba(74, 186, 122, 0.3)" },
  unknown: { bg: "rgba(45, 45, 55, 0.4)", text: "#97979d", border: "rgba(255, 255, 255, 0.08)" },
};

function StockoutRisksPage() {
  const { data: risks, isLoading, isError, refetch } = useStockoutRisks();
  const generate = useGenerateStockoutRisks();

  const [reorderingRisk, setReorderingRisk] = useState<StockoutPrediction | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            SENTINEL INTELLIGENCE
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Stockout Risks & Buffer Analysis
          </h1>
          <p className="mt-1 text-xs text-[#97979d]">
            Sorted by depletion urgency. Restock items directly before stockout thresholds are breached.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/purchase-orders"
            className="text-xs px-3.5 py-2 border border-white/10 bg-[#1a1a22] hover:bg-[#22222c] rounded-lg text-[#e8e6e3] transition-all"
          >
            Inbound Orders →
          </Link>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="text-xs font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
          >
            {generate.isPending ? "Analyzing Vectors..." : "Run Sentinel Audit"}
          </button>
        </div>
      </div>

      {/* Main List Container */}
      <div className="mt-6">
        {isLoading && <LoadingState message="Computing Bayesian stockout trajectories..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {risks?.length === 0 && (
          <EmptyState
            title="All safety buffers nominal"
            description="No significant stockout threats detected across monitored inventory bays."
          />
        )}
        {risks && risks.length > 0 && (
          <div className="flex flex-col gap-3">
            {risks.map((r) => {
              const badge = RISK_BADGES[r.riskLevel] || RISK_BADGES.unknown;
              return (
                <div
                  key={r.id}
                  className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[rgba(212,168,83,0.3)] transition-all shadow-md group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/products/${r.productId}`}
                        className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                      >
                        {r.productName}
                      </Link>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-[#97979d]">
                      <span>
                        On Hand: <strong className="text-[#e8e6e3]">{r.currentStock}</strong>
                      </span>
                      {r.incomingStock > 0 && (
                        <span className="text-[#4aba7a]">+{r.incomingStock} In Transit</span>
                      )}
                      {r.leadTimeDays !== null && (
                        <span>
                          Lead Time: <strong className="text-[#e8e6e3]">{r.leadTimeDays}d</strong>
                        </span>
                      )}
                    </div>

                    {r.daysUntilStockout !== null ? (
                      <p className="text-xs text-[#e8be66] mt-2">
                        Estimated exhaustion:{" "}
                        <span className="font-bold text-[#e8e6e3]">
                          {Number(r.daysUntilStockout).toFixed(1)} Days
                        </span>
                        <span className="text-[#5c5c64] ml-1.5">
                          ({r.demandSource === "forecast" ? "Bayesian forecast model" : "historical velocity"})
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#5c5c64] mt-2">
                        Depletion horizon computing...
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-xs px-3 py-1 rounded-md font-bold uppercase tracking-wider border"
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        borderColor: badge.border,
                      }}
                    >
                      {r.riskLevel}
                    </span>

                    {/* Direct Reorder Action Button */}
                    <button
                      onClick={() => setReorderingRisk(r)}
                      className="text-xs px-3.5 py-1.5 rounded-lg bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                      title="Draft purchase order immediately"
                    >
                      <span>⚡ Reorder</span>
                    </button>

                    <ExplainButton type="stockout-risk" id={r.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Reorder Modal */}
      {reorderingRisk && (
        <QuickReorderModal risk={reorderingRisk} onClose={() => setReorderingRisk(null)} />
      )}
    </div>
  );
}

function QuickReorderModal({
  risk,
  onClose,
}: {
  risk: StockoutPrediction;
  onClose: () => void;
}) {
  const createPoMutation = useCreatePurchaseOrder();
  const [quantity, setQuantity] = useState(() => {
    const daily = Number(risk.forecastedDailyDemand) || 2;
    const lead = risk.leadTimeDays || 3;
    return Math.max(10, Math.ceil(daily * (lead + 7)));
  });
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (risk.leadTimeDays || 3));
    return d.toISOString().split("T")[0];
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPoMutation.mutateAsync({
        productId: risk.productId,
        quantity,
        expectedArrivalDate,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create purchase order.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4 font-mono">
      <div className="bg-[#141418] border border-white/12 rounded-xl w-full max-w-md p-6 shadow-2xl text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-white/6">
          <h2 className="font-bold text-sm text-[#e8e6e3]">⚡ Rapid Restock Order</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <div className="mt-3 p-3 bg-white/4 rounded-lg">
          <p className="font-semibold text-[#e8e6e3] text-sm">{risk.productName}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[#97979d]">
            <span>Current Stock: <strong className="text-[#d45a4a]">{risk.currentStock}</strong></span>
            {risk.leadTimeDays && <span>Lead Time: {risk.leadTimeDays}d</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              ORDER QUANTITY (UNITS)
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors tabular-nums"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              EXPECTED ARRIVAL DATE
            </label>
            <input
              type="date"
              value={expectedArrivalDate}
              onChange={(e) => setExpectedArrivalDate(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors tabular-nums"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-[#d45a4a] bg-[#d45a4a]/10 border border-[#d45a4a]/30 p-2 rounded">
              {errorMsg}
            </p>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPoMutation.isPending}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] transition-all disabled:opacity-50"
            >
              {createPoMutation.isPending ? "Issuing PO..." : "Issue Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockoutRisksPage;