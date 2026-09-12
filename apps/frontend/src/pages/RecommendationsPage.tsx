import { useRecommendations, useGenerateRecommendations } from "../hooks/useRecommendations";
import RecommendationCard from "../components/recommendations/RecommendationCard";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";

function RecommendationsPage() {
  const { data: recommendations, isLoading, isError, refetch } = useRecommendations();
  const generate = useGenerateRecommendations();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            AUTONOMOUS REPLENISHMENT
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Reorder Recommendations
          </h1>
          <p className="mt-1 text-xs font-mono text-[#97979d]">
            Sorted by urgency — SKUs approaching depletion threshold require supplier dispatch.
          </p>
        </div>

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
        >
          {generate.isPending ? "Auditing Stock..." : "Run Reorder Analysis"}
        </button>
      </div>

      {/* Main List Container */}
      <div className="mt-6">
        {isLoading && <LoadingState message="Calculating optimal reorder quantities..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {recommendations?.length === 0 && (
          <EmptyState
            title="No active replenishment triggers"
            description="All monitored inventory is currently above reorder safety thresholds."
          />
        )}
        {recommendations && recommendations.length > 0 && (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPage;