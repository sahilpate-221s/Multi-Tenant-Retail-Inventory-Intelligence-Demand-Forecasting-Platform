import { Link } from "react-router-dom";
import { useDeadStockScores, useGenerateDeadStockScores } from "../hooks/useDeadStock";
import { formatReasonCode } from "../lib/reasonCodes";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import ExplainButton from "../components/ai/ExplainButton";

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#d45a4a]";
  if (score >= 50) return "text-[#d4a853]";
  return "text-[#97979d]";
}

function DeadStockPage() {
  const { data: scores, isLoading, isError, refetch } = useDeadStockScores();
  const generate = useGenerateDeadStockScores();

  const totalCapitalTiedUp = scores?.reduce((sum, s) => sum + Number(s.inventoryValue), 0) ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            CAPITAL EFFICIENCY
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Dead Stock & Stagnant SKU Audit
          </h1>
          <p className="mt-1 text-xs font-mono text-[#97979d]">
            Identifies immobilized working capital and recommends liquidation or write-down actions.
          </p>
        </div>

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
        >
          {generate.isPending ? "Auditing Ledger..." : "Analyze Dead Stock"}
        </button>
      </div>

      {scores && scores.length > 0 && (
        <div className="mt-6 bg-[#d45a4a]/10 border border-[#d45a4a]/30 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-mono font-semibold text-[#d45a4a]">
              TOTAL WORKING CAPITAL IMMOBILIZED IN DEAD INVENTORY
            </p>
            <p className="text-2xl md:text-3xl font-bold font-mono text-[#e8e6e3] mt-1 tabular-nums">
              {formatCurrency(totalCapitalTiedUp)}
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded bg-[#d45a4a]/20 text-[#d45a4a] border border-[#d45a4a]/40 font-bold uppercase">
            ACTION REQUIRED
          </span>
        </div>
      )}

      <div className="mt-6">
        {isLoading && <LoadingState message="Auditing stagnation metrics across all bays..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {scores?.length === 0 && (
          <EmptyState
            title="Zero dead stock detected"
            description="All active SKUs have demonstrated healthy turnover within expected velocity cycles."
          />
        )}
        {scores && scores.length > 0 && (
          <div className="flex flex-col gap-3">
            {scores.map((s) => (
              <div
                key={s.id}
                className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(212,168,83,0.3)] transition-all shadow-md group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      to={`/products/${s.productId}`}
                      className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                    >
                      {s.productName}
                    </Link>
                    <p className="text-xs font-mono text-[#97979d] mt-1">
                      On Hand: <strong className="text-[#e8e6e3]">{s.currentStock}</strong> ·{" "}
                      {s.daysSinceLastSale !== null ? `Last movement ${s.daysSinceLastSale} days ago` : "Never sold"}
                    </p>
                    <p className="text-xs font-mono text-[#97979d] mt-0.5">
                      Trapped Value:{" "}
                      <span className="font-semibold text-[#d4a853]">
                        {formatCurrency(Number(s.inventoryValue))}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <p className={`text-2xl font-bold tabular-nums ${scoreColor(s.score)}`}>
                      {s.score}
                    </p>
                    <p className="text-[10px] uppercase text-[#5c5c64]">Stagnation Index</p>
                  </div>
                </div>
                <ul className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] text-xs font-mono text-[#5c5c64] space-y-1">
                  {s.reasonCodes.map((code, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[#d45a4a]">•</span>
                      <span>{formatReasonCode(code)}</span>
                    </li>
                  ))}
                </ul>
                <ExplainButton type="dead-stock" id={s.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeadStockPage;