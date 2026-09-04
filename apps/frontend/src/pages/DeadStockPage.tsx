import { Link } from "react-router-dom";
import { useDeadStockScores, useGenerateDeadStockScores } from "../hooks/useDeadStock";
import { formatReasonCode } from "../lib/reasonCodes";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-status-danger";
  if (score >= 50) return "text-status-warning";
  return "text-slate-500";
}

function DeadStockPage() {
  const { data: scores, isLoading, isError, refetch } = useDeadStockScores();
  const generate = useGenerateDeadStockScores();

  const totalCapitalTiedUp = scores?.reduce((sum, s) => sum + Number(s.inventoryValue), 0) ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Dead Stock</h1>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md disabled:opacity-50"
        >
          {generate.isPending ? "Analyzing..." : "Analyze Inventory"}
        </button>
      </div>

      {scores && scores.length > 0 && (
        <div className="mt-3 bg-status-danger-bg border border-red-100 rounded-lg p-4">
          <p className="text-xs text-status-danger">Total capital tied up in slow/dead stock</p>
          <p className="text-2xl font-semibold text-status-danger mt-1">{formatCurrency(totalCapitalTiedUp)}</p>
        </div>
      )}

      <div className="mt-4">
        {isLoading && <LoadingState message="Loading dead stock analysis..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {scores?.length === 0 && (
          <EmptyState
            title="No dead stock detected"
            description="Click 'Analyze Inventory' to check for slow-moving or dead stock."
          />
        )}
        {scores && scores.length > 0 && (
          <div className="flex flex-col gap-3">
            {scores.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/products/${s.productId}`} className="font-medium text-slate-800 hover:underline">
                      {s.productName}
                    </Link>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Stock: {s.currentStock} · {s.daysSinceLastSale !== null ? `Last sale ${s.daysSinceLastSale} days ago` : "Never sold"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Inventory value: <span className="font-medium text-slate-700">{formatCurrency(Number(s.inventoryValue))}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${scoreColor(s.score)}`}>{s.score}</p>
                    <p className="text-xs text-slate-400">Dead Stock Score</p>
                  </div>
                </div>
                <ul className="mt-2 text-xs text-slate-500 list-disc list-inside">
                  {s.reasonCodes.map((code, i) => (
                    <li key={i}>{formatReasonCode(code)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeadStockPage;