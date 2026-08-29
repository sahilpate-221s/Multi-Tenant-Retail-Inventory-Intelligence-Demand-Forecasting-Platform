import { useState } from "react";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";

function StatesDemoPage() {
  const [view, setView] = useState<"loading" | "empty" | "error">("loading");

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Temporary demo of shared UI states — real dashboard arrives in Phase 6.
      </p>

      <div className="mt-4 flex gap-2">
        {(["loading", "empty", "error"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              view === v
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white">
        {view === "loading" && <LoadingState message="Loading dashboard..." />}
        {view === "empty" && (
          <EmptyState
            title="No data yet"
            description="Import your first sales CSV to see insights here."
          />
        )}
        {view === "error" && (
          <ErrorState onRetry={() => alert("Retry clicked")} />
        )}
      </div>
    </div>
  );
}

export default StatesDemoPage;