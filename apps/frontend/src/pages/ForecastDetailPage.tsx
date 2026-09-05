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
    <div className="p-8">
      <Link to="/forecasts" className="text-sm text-slate-500 hover:underline">← Back to Forecasts</Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Demand Forecast</h1>
        <div className="flex gap-2">
          {[7, 30].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h as 7 | 30)}
              className={`text-xs px-3 py-1.5 rounded-md border ${
                horizon === h ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {h}-day
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {isLoading && <LoadingState message="Loading forecast..." />}

        {noForecastYet && (
          <EmptyState
            title="No forecast generated yet"
            description="Generate a forecast to see predicted demand for this product."
            action={
              <button
                onClick={() => generate.mutate({ productId: productId!, horizonDays: horizon })}
                disabled={generate.isPending}
                className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md disabled:opacity-50"
              >
                {generate.isPending ? "Generating..." : `Generate ${horizon}-Day Forecast`}
              </button>
            }
          />
        )}

        {forecast && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Predicted total demand ({horizon} days)</p>
                <p className="text-3xl font-semibold text-slate-800 mt-1">
                  {Number(forecast.forecastedTotalDemand).toFixed(1)} units
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ≈ {Number(forecast.forecastedDailyDemand).toFixed(2)} units/day
                </p>
              </div>
              <ConfidenceBadge confidence={forecast.confidence} />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-xs text-slate-500">
              <span>Model used: <strong className="text-slate-700">{forecast.modelUsed.replaceAll("_", " ")}</strong></span>
              <span>Based on: <strong className="text-slate-700">{forecast.daysOfHistoryUsed} days</strong> of history</span>
              <span>Generated: {new Date(forecast.generatedAt).toLocaleString()}</span>
            </div>

            <button
              onClick={() => generate.mutate({ productId: productId!, horizonDays: horizon })}
              disabled={generate.isPending}
              className="mt-4 text-xs text-slate-500 hover:text-slate-800 underline"
            >
              {generate.isPending ? "Regenerating..." : "Regenerate forecast"}
            </button>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-medium text-slate-700 mb-2">Forecast History</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr><th className="py-1">Date</th><th className="py-1">Horizon</th><th className="py-1">Predicted</th><th className="py-1">Model</th><th className="py-1">Confidence</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-500">{new Date(h.generatedAt).toLocaleDateString()}</td>
                    <td className="py-1.5">{h.horizonDays}d</td>
                    <td className="py-1.5">{Number(h.forecastedTotalDemand).toFixed(1)}</td>
                    <td className="py-1.5 text-slate-500">{h.modelUsed.replaceAll("_", " ")}</td>
                    <td className="py-1.5"><ConfidenceBadge confidence={h.confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForecastDetailPage;