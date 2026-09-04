import { useState } from "react";
import { Link } from "react-router-dom";
import type { Recommendation } from "../../lib/types";
import { formatReasonCode } from "../../lib/reasonCodes";
import { useUpdateRecommendationStatus } from "../../hooks/useRecommendations";

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useUpdateRecommendationStatus();

  const isUrgent = rec.daysUntilStockout !== null && Number(rec.daysUntilStockout) <= 3;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/products/${rec.productId}`} className="font-medium text-slate-800 hover:underline">
            {rec.productName}
          </Link>
          <p className="text-sm text-slate-500 mt-0.5">
            Recommended order:{" "}
            <span className="font-semibold text-slate-800">{rec.recommendedQuantity} units</span>
          </p>
          {rec.daysUntilStockout !== null && (
            <p className={`text-xs mt-1 ${isUrgent ? "text-status-danger" : "text-slate-400"}`}>
              Estimated stockout in approximately {Number(rec.daysUntilStockout).toFixed(1)} days
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => updateStatus.mutate({ id: rec.id, status: "ordered" })}
            className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-md"
          >
            Mark Ordered
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: rec.id, status: "dismissed" })}
            className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md"
          >
            Dismiss
          </button>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline"
      >
        {expanded ? "Hide details" : "Why is this recommended?"}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
            <dt className="text-slate-400">Current stock</dt><dd>{rec.currentStock}</dd>
            <dt className="text-slate-400">Incoming stock</dt><dd>{rec.incomingStock}</dd>
            <dt className="text-slate-400">Avg. daily demand</dt><dd>{Number(rec.averageDailyDemand).toFixed(2)}</dd>
            <dt className="text-slate-400">Supplier lead time</dt><dd>{rec.leadTimeDays ?? "—"} days</dd>
            <dt className="text-slate-400">Safety stock</dt><dd>{rec.safetyStock}</dd>
            <dt className="text-slate-400">Reorder point</dt><dd>{rec.reorderPoint ?? "—"}</dd>
          </dl>
          <p className="text-xs text-slate-400 font-medium mt-3 mb-1">Reasons</p>
          <ul className="text-xs text-slate-600 flex flex-col gap-1 list-disc list-inside">
            {rec.reasonCodes.map((code, i) => (
              <li key={i}>{formatReasonCode(code)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;