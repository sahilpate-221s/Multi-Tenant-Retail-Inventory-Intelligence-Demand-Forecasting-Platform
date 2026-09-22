import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DailySalesPoint, MonthlyTrendPoint } from "../../lib/types";

interface RevenueTrendChartProps {
  dailySales?: DailySalesPoint[];
  monthlyTrends?: MonthlyTrendPoint[];
  currencySymbol?: string;
}

export default function RevenueTrendChart({
  dailySales = [],
  monthlyTrends = [],
  currencySymbol = "₹",
}: RevenueTrendChartProps) {
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [metric, setMetric] = useState<"revenue" | "units">("revenue");

  // Format data points for display
  const chartData = useMemo(() => {
    if (viewMode === "monthly") {
      if (!monthlyTrends || monthlyTrends.length === 0) return [];
      return monthlyTrends.map((pt) => {
        // Format YYYY-MM to e.g. "Mar '26"
        let label = pt.month;
        try {
          const [year, month] = pt.month.split("-");
          const d = new Date(Number(year), Number(month) - 1);
          label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        } catch {
          // fallback to raw
        }
        return {
          rawDate: pt.month,
          label,
          revenue: pt.revenue,
          units: pt.unitsSold,
          orders: pt.orderCount,
        };
      });
    }

    if (!dailySales || dailySales.length === 0) return [];
    return dailySales.map((pt) => {
      // Format YYYY-MM-DD to "DD MMM"
      let label = pt.date;
      try {
        const d = new Date(pt.date);
        label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      } catch {
        // fallback
      }
      return {
        rawDate: pt.date,
        label,
        revenue: pt.revenue,
        units: pt.unitsSold,
        orders: pt.orderCount,
      };
    });
  }, [viewMode, dailySales, monthlyTrends]);

  // Aggregate metrics for summary badge
  const stats = useMemo(() => {
    if (chartData.length === 0) return { total: 0, peak: 0, peakLabel: "N/A", avg: 0 };
    let total = 0;
    let peak = 0;
    let peakLabel = "";

    for (const d of chartData) {
      const val = metric === "revenue" ? d.revenue : d.units;
      total += val;
      if (val > peak) {
        peak = val;
        peakLabel = d.label;
      }
    }

    const avg = Math.round(total / chartData.length);
    return { total, peak, peakLabel, avg };
  }, [chartData, metric]);

  const formatNumber = (val: number) => {
    if (metric === "revenue") {
      if (val >= 10000000) return `${currencySymbol}${(val / 10000000).toFixed(1)}Cr`;
      if (val >= 100000) return `${currencySymbol}${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)}k`;
      return `${currencySymbol}${val.toLocaleString("en-IN")}`;
    }
    return val.toLocaleString("en-IN");
  };

  const isGold = metric === "revenue";
  const strokeColor = isGold ? "#d4a853" : "#38bdf8";
  const gradientId = isGold ? "goldRevenueGrad" : "blueUnitsGrad";

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#14141a] to-[#0f0f13] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300 hover:border-white/15">
      {/* Glow Effect */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: isGold ? "#d4a853" : "#38bdf8" }}
      />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse shadow-sm"
              style={{
                background: strokeColor,
                boxShadow: `0 0 10px ${strokeColor}`,
              }}
            />
            <span
              className="text-[10px] font-mono uppercase tracking-widest font-semibold"
              style={{ color: strokeColor }}
            >
              FINANCIAL VELOCITY
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#f4f4f5] tracking-tight">
            Revenue & Demand Trajectory
          </h3>
          <p className="text-xs text-[#97979d]">
            Multi-horizon trend analytics demonstrating sales continuity and turnover volume.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Time mode selector */}
          <div className="flex p-1 rounded-lg bg-[#0c0c0e] border border-white/8">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                viewMode === "daily"
                  ? "bg-white/12 text-[#f4f4f5] shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                viewMode === "monthly"
                  ? "bg-white/12 text-[#f4f4f5] shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              12M Macro
            </button>
          </div>

          {/* Metric selector */}
          <div className="flex p-1 rounded-lg bg-[#0c0c0e] border border-white/8">
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                metric === "revenue"
                  ? "bg-[#d4a853]/20 text-[#d4a853] border border-[#d4a853]/40 shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              <span>Revenue</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric("units")}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                metric === "units"
                  ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              <span>Units</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 my-2 border-b border-white/5 relative z-10">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#97979d]">
            Total {metric === "revenue" ? "Revenue" : "Units"}
          </p>
          <p className="text-base font-bold text-[#f4f4f5] mt-0.5">
            {formatNumber(stats.total)}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#97979d]">
            Average / {viewMode === "daily" ? "Day" : "Month"}
          </p>
          <p className="text-base font-bold text-[#f4f4f5] mt-0.5">
            {formatNumber(stats.avg)}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#97979d]">
            Peak Period
          </p>
          <p className="text-base font-bold text-[#f4f4f5] mt-0.5 truncate">
            {stats.peakLabel || "N/A"}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#97979d]">
            Peak Volume
          </p>
          <p
            className="text-base font-bold mt-0.5"
            style={{ color: strokeColor }}
          >
            {formatNumber(stats.peak)}
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full pt-4 relative z-10">
        {chartData.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-[#97979d] text-xs">
            <p>No transactions recorded for this period yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="goldRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a853" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#d4a853" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#d4a853" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="blueUnitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tick={{ fill: "#97979d", fontSize: 11, fontFamily: "monospace" }}
                dy={6}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#97979d", fontSize: 11, fontFamily: "monospace" }}
                tickFormatter={(v) => formatNumber(v)}
                width={65}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl bg-[#0c0c0e]/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs">
                      <p className="text-[#97979d] text-[11px] mb-1.5 pb-1 border-b border-white/10 font-sans">
                        {data.rawDate}
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[#f4f4f5]">Revenue:</span>
                        <span className="font-bold text-[#d4a853]">
                          {currencySymbol}
                          {Number(data.revenue).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[#f4f4f5]">Units Sold:</span>
                        <span className="font-bold text-[#38bdf8]">
                          {data.units.toLocaleString("en-IN")} pcs
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[10px] text-[#97979d] pt-1 border-t border-white/5">
                        <span>Transactions:</span>
                        <span>{data.orders} orders</span>
                      </div>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey={metric === "revenue" ? "revenue" : "units"}
                stroke={strokeColor}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#0c0c0e",
                  stroke: strokeColor,
                  strokeWidth: 2.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
