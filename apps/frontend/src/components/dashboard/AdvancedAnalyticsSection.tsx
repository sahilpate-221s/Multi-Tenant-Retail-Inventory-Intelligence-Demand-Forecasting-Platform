import { useAdvancedAnalytics } from "../../hooks/useAdvancedAnalytics";

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function AdvancedAnalyticsSection() {
  const { data, isLoading } = useAdvancedAnalytics();

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] flex items-center justify-center gap-3">
        <span className="w-4 h-4 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#97979d]">Syncing advanced analytics telemetry...</span>
      </div>
    );
  }

  if (!data) return null;

  const { recommendationMetrics, capitalEfficiency, categoryIntelligence, forecastPerformance } = data;

  return (
    <div className="space-y-6">
      {/* ─── SECTION HEADER ─── */}
      <div className="flex items-center justify-between">
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
            ADVANCED INTELLIGENCE & CAPITAL EFFICIENCY
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#5c5c64] hidden sm:inline">
          LIVE ENGINE TELEMETRY
        </span>
      </div>

      {/* ─── 3 SUMMARY KPI TILES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recommendation Acceptance */}
        <div className="p-5 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(212,168,83,0.3)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#97979d]">
              RECOMMENDATION ACCEPTANCE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#e8e6e3] mt-2 tabular-nums">
            {recommendationMetrics.acceptanceRate !== null ? `${recommendationMetrics.acceptanceRate}%` : "—"}
          </p>
          <p className="text-[11px] font-mono text-[#97979d] mt-1.5">
            <span className="text-[#4aba7a]">{recommendationMetrics.ordered} ordered</span> ·{" "}
            <span className="text-[#97979d]">{recommendationMetrics.dismissed} dismissed</span> ·{" "}
            <span className="text-[#d4a853]">{recommendationMetrics.pending} pending</span>
          </p>
        </div>

        {/* Capital Efficiency */}
        <div className="p-5 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(212,168,83,0.3)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#97979d]">
              CAPITAL EFFICIENCY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#4aba7a] mt-2 tabular-nums">
            {capitalEfficiency.efficiencyPercent !== null ? `${capitalEfficiency.efficiencyPercent}%` : "—"}
          </p>
          <p className="text-[11px] font-mono text-[#97979d] mt-1.5">
            <span className="text-[#e8e6e3] font-semibold">{formatCurrency(capitalEfficiency.healthyStockValue)}</span> healthy of{" "}
            <span>{formatCurrency(capitalEfficiency.totalInventoryValue)}</span>
          </p>
        </div>

        {/* Forecast Accuracy (MAE) */}
        <div className="p-5 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(212,168,83,0.3)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#97979d]">
              FORECAST ACCURACY (MAE)
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#e8e6e3] mt-2 tabular-nums">
            {forecastPerformance.meanAbsoluteError !== null ? forecastPerformance.meanAbsoluteError : "—"}
          </p>
          <p className="text-[11px] font-mono text-[#97979d] mt-1.5">
            <span className="text-[#38bdf8] font-semibold">{forecastPerformance.scoreableForecastCount}</span> of {forecastPerformance.totalForecastCount} forecasts scoreable so far
          </p>
        </div>
      </div>

      {/* ─── CATEGORY BREAKDOWN TABLE ─── */}
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
              CATEGORY CAPITAL & DEAD STOCK INTELLIGENCE
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#5c5c64]">
            {categoryIntelligence.length} ACTIVE CATEGORIES
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0e0e12] border-b border-[rgba(255,255,255,0.08)] text-[10px] uppercase text-[#5c5c64] tracking-wider">
              <tr>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-4">Active SKUs</th>
                <th className="py-3 px-4">Valuation</th>
                <th className="py-3 px-5">Avg. Dead Stock Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {categoryIntelligence.map((c) => {
                const score = c.averageDeadStockScore;
                const isHighDeadStock = score !== null && score >= 30;

                return (
                  <tr key={c.categoryName} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 px-5 font-semibold text-[#e8e6e3]">{c.categoryName}</td>
                    <td className="py-3 px-4 text-[#97979d]">{c.productCount}</td>
                    <td className="py-3 px-4 text-[#e8e6e3]">{formatCurrency(c.totalInventoryValue)}</td>
                    <td className="py-3 px-5">
                      {score !== null ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isHighDeadStock
                              ? "bg-[rgba(212,90,74,0.1)] text-[#d45a4a] border-[rgba(212,90,74,0.25)]"
                              : "bg-[rgba(74,186,122,0.1)] text-[#4aba7a] border-[rgba(74,186,122,0.25)]"
                          }`}
                        >
                          {score} / 100
                        </span>
                      ) : (
                        <span className="text-[#5c5c64]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FORECAST PERFORMANCE DETAIL (WHEN ENTRIES EXIST) ─── */}
      {forecastPerformance.entries.length > 0 && (
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
                  background: "#38bdf8",
                  boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
                }}
              />
              <span className="sp-label" style={{ fontSize: "0.625rem" }}>
                FORECAST PERFORMANCE DETAIL (HISTORICAL VERIFICATION)
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#5c5c64]">
              {forecastPerformance.entries.length} SCOREABLE HORIZONS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0e0e12] border-b border-[rgba(255,255,255,0.08)] text-[10px] uppercase text-[#5c5c64] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Product Name</th>
                  <th className="py-3 px-4">Horizon</th>
                  <th className="py-3 px-4">Forecasted Demand</th>
                  <th className="py-3 px-4">Actual Demand</th>
                  <th className="py-3 px-5">Absolute Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {forecastPerformance.entries.map((e) => (
                  <tr key={e.forecastId} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 px-5 font-semibold text-[#e8e6e3]">{e.productName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/25">
                        {e.horizonDays}D
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#97979d]">{e.forecastedTotalDemand.toFixed(1)}</td>
                    <td className="py-3 px-4 text-[#e8e6e3]">{e.actualTotalDemand.toFixed(1)}</td>
                    <td className="py-3 px-5 text-[#d4a853] font-semibold">
                      ±{e.absoluteError.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedAnalyticsSection;