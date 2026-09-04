import { useRecommendations, useGenerateRecommendations } from "../hooks/useRecommendations";
import RecommendationCard from "../components/recommendations/RecommendationCard";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";

function RecommendationsPage() {
  const { data: recommendations, isLoading, isError, refetch } = useRecommendations();
  const generate = useGenerateRecommendations();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Reorder Recommendations</h1>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md disabled:opacity-50"
        >
          {generate.isPending ? "Checking..." : "Check for Recommendations"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Sorted by urgency — products closest to stocking out appear first.
      </p>

      <div className="mt-4">
        {isLoading && <LoadingState message="Loading recommendations..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {recommendations?.length === 0 && (
          <EmptyState
            title="No pending recommendations"
            description="Click 'Check for Recommendations' to analyze your current inventory."
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