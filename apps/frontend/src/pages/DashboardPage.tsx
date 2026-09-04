import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboard } from "../hooks/useDashboard";
import SummaryCard from "../components/dashboard/SummaryCard";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";
import EmptyState from "../components/states/EmptyState";

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useDashboard(days);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`text-xs px-3 py-1.5 rounded-md border ${
                days === p.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="mt-4"><LoadingState message="Loading dashboard..." /></div>}
      {isError && <div className="mt-4"><ErrorState onRetry={() => refetch()} /></div>}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label={`Revenue (${days}d)`} value={formatCurrency(data.totalRevenue)} />
            <SummaryCard label="Units Sold" value={String(data.unitsSold)} />
            <SummaryCard label="Inventory Value" value={formatCurrency(data.inventoryValue)} />
            <SummaryCard
              label="Turnover Ratio"
              value={data.turnoverRatio !== null ? data.turnoverRatio.toFixed(2) : "—"}
              sublabel="COGS ÷ inventory value"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-sm font-medium text-slate-700">Fast Movers</h2>
              {data.fastMovers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No sales in this period yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.fastMovers.map((p) => (
                    <li key={p.productId} className="flex justify-between text-sm">
                      <Link to={`/products/${p.productId}`} className="text-slate-700 hover:underline">{p.productName}</Link>
                      <span className="text-status-success font-medium">{p.unitsSold} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-sm font-medium text-slate-700">Slow Movers</h2>
              {data.slowMovers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No active products yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.slowMovers.map((p) => (
                    <li key={p.productId} className="flex justify-between text-sm">
                      <Link to={`/products/${p.productId}`} className="text-slate-700 hover:underline">{p.productName}</Link>
                      <span className="text-slate-400">
                        {p.unitsSold} sold
                        {p.daysSinceLastSale !== null && ` · ${p.daysSinceLastSale}d since last sale`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-medium text-slate-700">Category Performance</h2>
            {data.categoryPerformance.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No category revenue in this period" />
              </div>
            ) : (
              <div className="mt-3" style={{ height: Math.max(120, data.categoryPerformance.length * 45) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categoryPerformance} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="categoryName" type="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#0f172a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;