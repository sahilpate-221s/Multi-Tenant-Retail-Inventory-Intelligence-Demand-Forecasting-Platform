import { useState } from "react";
import { useExplain } from "../../hooks/useExplain";
import { ApiError } from "../../lib/apiClient";

type ExplainType = "reorder-recommendation" | "dead-stock" | "stockout-risk" | "anomaly";

function ExplainButton({ type, id }: { type: ExplainType; id: string }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const explain = useExplain();

  async function handleClick() {
    setError(null);
    try {
      const result = await explain.mutateAsync({ type, id });
      setExplanation(result.explanation);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate an explanation right now.");
    }
  }

  if (explanation) {
    return (
      <div className="mt-2 text-xs font-mono text-[#e8e6e3] bg-[#0e0e14] rounded-lg p-3 border border-[rgba(212,168,83,0.25)] shadow-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
            <p className="text-[10px] font-bold text-[#d4a853] uppercase tracking-wider">AI Explanation</p>
          </div>
          <button
            onClick={() => setExplanation(null)}
            className="text-[10px] text-[#97979d] hover:text-[#e8e6e3] transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="leading-relaxed text-[#c4c4cb]">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleClick}
        disabled={explain.isPending}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#d4a853] hover:text-[#e8be66] hover:underline disabled:opacity-50 transition-colors"
      >
        <span className="text-[10px]">✨</span>
        <span>{explain.isPending ? "Generating explanation..." : "Explain this (AI)"}</span>
      </button>
      {error && <p className="text-xs font-mono text-[#d45a4a] mt-1">{error}</p>}
    </div>
  );
}

export default ExplainButton;