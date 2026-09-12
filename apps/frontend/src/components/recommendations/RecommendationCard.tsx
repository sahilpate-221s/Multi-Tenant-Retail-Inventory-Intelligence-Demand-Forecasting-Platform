import { useState } from "react";
import { Link } from "react-router-dom";
import type { Recommendation } from "../../lib/types";
import { formatReasonCode } from "../../lib/reasonCodes";
import { useUpdateRecommendationStatus } from "../../hooks/useRecommendations";
import ExplainButton from "../ai/ExplainButton";

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useUpdateRecommendationStatus();

  const isUrgent = rec.daysUntilStockout !== null && Number(rec.daysUntilStockout) <= 3;

  return (
    <div className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(212,168,83,0.3)] transition-all shadow-md">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link
            to={`/products/${rec.productId}`}
            className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
          >
            {rec.productName}
          </Link>
          <p className="text-xs font-mono text-[#97979d] mt-1">
            Recommended batch PO:{" "}
            <span className="font-bold text-[#d4a853]">{rec.recommendedQuantity} units</span>
          </p>
          {rec.daysUntilStockout !== null && (
            <p className={`text-xs font-mono mt-1 ${isUrgent ? "text-[#d45a4a] font-bold" : "text-[#e8be66]"}`}>
              Estimated stockout in approximately {Number(rec.daysUntilStockout).toFixed(1)} days
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <button
            onClick={() => updateStatus.mutate({ id: rec.id, status: "ordered" })}
            className="px-3 py-1.5 rounded-lg bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold transition-all shadow-sm active:scale-95"
          >
            Mark Ordered
          </button>
          <button
            onClick={() => updateStatus.mutate({ id: rec.id, status: "dismissed" })}
            className="px-3 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-[#97979d] hover:text-[#e8e6e3] border border-[rgba(255,255,255,0.08)] transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-mono text-[#5c5c64] hover:text-[#d4a853] transition-colors flex items-center gap-1"
      >
        <span>{expanded ? "▾ Collapse technical factors" : "▸ Why is this recommended?"}</span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-2.5 rounded bg-[#0c0c0e] border border-[rgba(255,255,255,0.04)]">
              <dt className="text-[10px] text-[#5c5c64]">CURRENT STOCK</dt>
              <dd className="font-semibold text-[#e8e6e3] mt-0.5">{rec.currentStock}</dd>
            </div>
            <div className="p-2.5 rounded bg-[#0c0c0e] border border-[rgba(255,255,255,0.04)]">
              <dt className="text-[10px] text-[#5c5c64]">INCOMING PIPELINE</dt>
              <dd className="font-semibold text-[#4aba7a] mt-0.5">{rec.incomingStock}</dd>
            </div>
            <div className="p-2.5 rounded bg-[#0c0c0e] border border-[rgba(255,255,255,0.04)]">
              <dt className="text-[10px] text-[#5c5c64]">DAILY CONSUMPTION</dt>
              <dd className="font-semibold text-[#e8e6e3] mt-0.5">{Number(rec.averageDailyDemand).toFixed(2)}/d</dd>
            </div>
            <div className="p-2.5 rounded bg-[#0c0c0e] border border-[rgba(255,255,255,0.04)]">
              <dt className="text-[10px] text-[#5c5c64]">SUPPLIER LEAD</dt>
              <dd className="font-semibold text-[#e8e6e3] mt-0.5">{rec.leadTimeDays ?? "—"} days</dd>
            </div>
          </dl>
          {rec.reasonCode && (
            <p className="mt-2.5 text-xs font-mono text-[#97979d]">
              Decision logic: <span className="text-[#e8be66]">{formatReasonCode(rec.reasonCode)}</span>
            </p>
          )}
          <ExplainButton type="reorder-recommendation" id={rec.id} />
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;