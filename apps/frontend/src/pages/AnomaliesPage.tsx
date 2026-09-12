import { Link } from "react-router-dom";
import { useAnomalies, useGenerateAnomalies } from "../hooks/useAnomalies";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import ExplainButton from "../components/ai/ExplainButton";

const SEVERITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  extreme: { bg: "rgba(212, 90, 74, 0.15)", text: "#d45a4a", border: "rgba(212, 90, 74, 0.3)" },
  significant: { bg: "rgba(212, 168, 83, 0.15)", text: "#d4a853", border: "rgba(212, 168, 83, 0.3)" },
  moderate: { bg: "rgba(107, 140, 199, 0.15)", text: "#6b8cc7", border: "rgba(107, 140, 199, 0.3)" },
};

function AnomaliesPage() {
  const { data: anomalies, isLoading, isError, refetch } = useAnomalies();
  const generate = useGenerateAnomalies();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            SIGNAL TELEMETRY
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Velocity & Demand Anomalies
          </h1>
          <p className="mt-1 text-xs font-mono text-[#97979d]">
            Statistical divergence radar detecting irregular spikes and sharp deceleration in consumption.
          </p>
        </div>

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
        >
          {generate.isPending ? "Analyzing Z-Scores..." : "Scan for Anomalies"}
        </button>
      </div>

      {/* Main List */}
      <div className="mt-6">
        {isLoading && <LoadingState message="Scanning consumption signals for outliers..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {anomalies?.length === 0 && (
          <EmptyState
            title="All velocity vectors normal"
            description="Demand variance is currently within standard 2-sigma historical distribution."
          />
        )}
        {anomalies && anomalies.length > 0 && (
          <div className="flex flex-col gap-3">
            {anomalies.map((a) => {
              const badge = SEVERITY_BADGES[a.severity] || SEVERITY_BADGES.moderate;
              return (
                <div
                  key={a.id}
                  className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(212,168,83,0.3)] transition-all shadow-md group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        to={`/products/${a.productId}`}
                        className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                      >
                        {a.productName}
                      </Link>
                      <p className="text-xs font-mono text-[#97979d] mt-1">
                        Demand {a.direction === "spike" ? "spiked to" : "dropped to"}{" "}
                        <strong className="text-[#d4a853]">{Number(a.observedValue).toFixed(1)}</strong> units, vs baseline mean{" "}
                        <strong className="text-[#e8e6e3]">{Number(a.baselineMean).toFixed(1)}</strong>
                        {a.zScore && ` (σ-divergence: ${Number(a.zScore).toFixed(2)})`}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider shrink-0 border"
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        borderColor: badge.border,
                      }}
                    >
                      {a.severity}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] font-mono text-xs">
                    <p className="text-[10px] text-[#5c5c64] uppercase tracking-wider font-bold mb-1.5">
                      HYPOTHETICAL ROOT CAUSE VECTORS
                    </p>
                    <ul className="text-[#97979d] space-y-1">
                      {a.possibleCauses.map((cause, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-[#d4a853]">//</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ExplainButton type="anomaly" id={a.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnomaliesPage;