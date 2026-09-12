import { Link } from "react-router-dom";
import { useStockoutRisks, useGenerateStockoutRisks } from "../hooks/useStockoutRisks";
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            SENTINEL INTELLIGENCE
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Stockout Risks & Buffer Analysis
          </h1>
          <p className="mt-1 text-xs font-mono text-[#97979d]">
            Sorted by urgency relative to supplier lead times and dynamic consumption velocity.
          </p>
        </div>

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
        >
          {generate.isPending ? "Analyzing Vectors..." : "Run Sentinel Audit"}
        </button>
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

                    <div className="mt-1 flex items-center gap-3 text-xs font-mono text-[#97979d]">
                      <span>On Hand: <strong className="text-[#e8e6e3]">{r.currentStock}</strong></span>
                      {r.incomingStock > 0 && (
                        <span className="text-[#4aba7a]">+{r.incomingStock} In Transit</span>
                      )}
                      {r.leadTimeDays !== null && (
                        <span>Lead Time: <strong className="text-[#e8e6e3]">{r.leadTimeDays}d</strong></span>
                      )}
                    </div>

                    {r.daysUntilStockout !== null ? (
                      <p className="text-xs font-mono text-[#e8be66] mt-2">
                        Estimated exhaustion:{" "}
                        <span className="font-bold text-[#e8e6e3]">
                          {Number(r.daysUntilStockout).toFixed(1)} Days
                        </span>
                        <span className="text-[#5c5c64] ml-1.5">
                          ({r.demandSource === "forecast" ? "Bayesian forecast model" : "historical velocity"})
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-[#5c5c64] mt-2">
                        Depletion horizon computing...
                      </p>
                    )}
                  </div>

                  <span
                    className="text-xs px-3 py-1 rounded-md font-mono font-bold uppercase tracking-wider shrink-0 border"
                    style={{
                      background: badge.bg,
                      color: badge.text,
                      borderColor: badge.border,
                    }}
                  >
                    {r.riskLevel}
                  </span>
                  <ExplainButton type="stockout-risk" id={r.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StockoutRisksPage;