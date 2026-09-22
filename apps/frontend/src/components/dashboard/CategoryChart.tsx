import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface CategoryChartProps {
  data: { categoryName: string; revenue: number }[];
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Dark-themed category performance chart.
 * Graphite background, thin grid, amber bars, monospaced numbers.
 */
function CategoryChart({ data }: CategoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12"
        style={{ color: "var(--color-sp-text-muted)", fontSize: "0.8125rem" }}
      >
        No category revenue in this period
      </div>
    );
  }

  return (
    <div style={{ height: Math.max(140, data.length * 48) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="#262629"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            tick={{
              fontSize: 11,
              fill: "#5c5c64",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={{ stroke: "#262629" }}
            tickLine={{ stroke: "#262629" }}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
            }
          />
          <YAxis
            dataKey="categoryName"
            type="category"
            width={100}
            tick={{
              fontSize: 12,
              fill: "#97979d",
              fontFamily: "'Inter', sans-serif",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: unknown) => [formatCurrency(Number(value) || 0), "Revenue"]}
            contentStyle={{
              background: "#212124",
              border: "1px solid #303035",
              borderRadius: "2px",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#e8e6e3",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            itemStyle={{ color: "#d4a853" }}
            labelStyle={{ color: "#97979d", fontSize: "11px" }}
            cursor={{ fill: "rgba(212, 168, 83, 0.04)" }}
          />
          <Bar
            dataKey="revenue"
            radius={[0, 2, 2, 0]}
            fill="#d4a853"
            fillOpacity={0.85}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryChart;
