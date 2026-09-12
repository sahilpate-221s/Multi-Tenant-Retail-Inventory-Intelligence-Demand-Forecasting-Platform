import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLatestForecast, useForecastHistory, useGenerateForecast } from "../hooks/useForecasting";
import ConfidenceBadge from "../components/forecasting/ConfidenceBadge";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import { ApiError } from "../lib/apiClient";

function ForecastDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [horizon, setHorizon] = useState<7 | 30>(7);
  const { data: forecast, isLoading, error } = useLatestForecast(productId!, horizon);
  const { data: history } = useForecastHistory(productId!);
  const generate = useGenerateForecast();

  const noForecastYet = error instanceof ApiError && error.code === "NO_FORECAST_YET";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      <Link to="/forecasts" className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors flex items-center gap-1.5">
        ← Back to Demand Forecasts
      </Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            STATISTICAL PROJECTION
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Algorithmic Demand Vector
          </h1>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#141418] border border-[rgba(255,255,255,0.08)]">
          {[7, 30].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h as 7 | 30)}
              className={`text-xs px-3.5 py-1.5 rounded font-semibold transition-all ${
                horizon === h
                  ? "bg-[#d4a853] text-[#0c0c0e] shadow-md"
                  : "text-[#97979d] hover:text-[#e8e6e3]"
              }`}
            >
              {h}-Day Horizon
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Executing Bayesian demand synthesis..." />}

        {noForecastYet && (
          <EmptyState
            title="No projection models generated yet"
            description="Generate a multi-horizon forecast to evaluate prospective demand velocity."
            action={
              <button
                onClick={() => generate.mutate({ productId: productId!, horizonDays: horizon })}
                disabled={generate.isPending}
                className="text-xs font-semibold px-4 py-2 bg-[#d4a853] text-[#0c0c0e] rounded-lg shadow-md active:scale-95 disabled:opacity-50"
              >
                {generate.isPending ? "Computing..." : `Generate ${horizon}-Day Forecast`}
              </button>
            }
          />
        )}

        {forecast && (
          <div className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#97979d]">
                  PROJECTED TOTAL DEMAND ({horizon} DAYS)
                </p>
                <p className="text-3xl md:text-4xl font-bold text-[#d4a853] mt-1 tabular-nums">
                  {Number(forecast.forecastedTotalDemand).toFixed(1)} <span className="text-lg text-[#e8e6e3] font-normal">units</span>
                </p>
                <p className="text-xs text-[#97979d] mt-1">
                  ≈ {Number(forecast.forecastedDailyDemand).toFixed(2)} units / day velocity
                </p>
              </div>
              <ConfidenceBadge confidence={forecast.confidence} />
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#97979d]">
              <div>Model: <strong className="text-[#e8e6e3]">{forecast.modelUsed.replaceAll("_", " ")}</strong></div>
              <div>Training Window: <strong className="text-[#e8e6e3]">{forecast.daysOfHistoryUsed} days</strong></div>
              <div>Generated: <span className="text-[#e8e6e3]">{new Date(forecast.generatedAt).toLocaleString()}</span></div>
            </div>

            <button
              onClick={() => generate.mutate({ productId: productId!, horizonDays: horizon })}
              disabled={generate.isPending}
              className="mt-6 text-xs text-[#d4a853] hover:underline"
            >
              {generate.isPending ? "Recalculating..." : "↻ Recalculate Projection Model"}
            </button>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="mt-6 bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#e8e6e3] mb-4">
              Historical Forecast Log
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Horizon</th>
                    <th className="py-2.5">Predicted Units</th>
                    <th className="py-2.5">Algorithmic Model</th>
                    <th className="py-2.5">Confidence Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-[#181822]/60 transition-colors">
                      <td className="py-3 text-[#97979d]">{new Date(h.generatedAt).toLocaleDateString()}</td>
                      <td className="py-3 font-semibold text-[#e8e6e3]">{h.horizonDays}d</td>
                      <td className="py-3 font-bold text-[#d4a853] tabular-nums">
                        {Number(h.forecastedTotalDemand).toFixed(1)}
                      </td>
                      <td className="py-3 text-[#97979d]">{h.modelUsed.replaceAll("_", " ")}</td>
                      <td className="py-3"><ConfidenceBadge confidence={h.confidence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForecastDetailPage;