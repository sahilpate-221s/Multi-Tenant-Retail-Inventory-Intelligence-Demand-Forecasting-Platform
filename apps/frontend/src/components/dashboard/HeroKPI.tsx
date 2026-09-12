import AnimatedNumber from "../motion/AnimatedNumber";

interface HeroKPIProps {
  revenue: number;
  days: number;
  unitsSold?: number;
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDailyAvg(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Apple-grade glassmorphic Revenue Card.
 * Ultra-translucent frosted glass with high blur and specular rim reflection,
 * so the 3D inventory scene behind it remains clearly visible through the glass.
 * All displayed values are strictly real and derived from API data.
 */
function HeroKPI({ revenue, days, unitsSold = 0 }: HeroKPIProps) {
  const dailyAverage = days > 0 ? revenue / days : 0;

  return (
    <div className="relative group select-none">
      {/* Apple-style Frosted Translucent Glass Surface */}
      <div
        className="rounded-2xl p-6 md:p-7 overflow-hidden transition-all duration-300"
        style={{
          minWidth: "330px",
          maxWidth: "370px",
          background: "rgba(10, 10, 14, 0.07)",
          backdropFilter: "blur(22px) saturate(180%)",
          WebkitBackdropFilter: "blur(22px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 30px 60px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Subtle Specular Top Rim Gradient */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.35)] to-transparent" />

        {/* Card Header: Label & Real Horizon Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#e8e6e3]">
              TOTAL REVENUE
            </span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[rgba(255,255,255,0.08)] text-[#e8e6e3] border border-[rgba(255,255,255,0.12)]">
            {days}D WINDOW
          </span>
        </div>

        {/* Animated Currency Value (100% Real API Data) */}
        <div className="mt-3.5">
          <AnimatedNumber
            value={revenue}
            format={formatCurrency}
            className="text-3xl md:text-4xl font-bold font-mono tracking-tight text-[#e8e6e3] leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            duration={1200}
          />
        </div>

        {/* Real Data Sub-Metrics Grid (100% Real API Data — Zero Hardcoded Fillers) */}
        <div className="mt-5 pt-3.5 border-t border-[rgba(255,255,255,0.08)] grid grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <span className="text-[10px] text-[#97979d] uppercase tracking-wider block">
              DAILY RUN-RATE
            </span>
            <span className="font-semibold text-[#e8e6e3] tabular-nums mt-0.5 block">
              {formatDailyAvg(dailyAverage)}
              <span className="text-[10px] text-[#97979d] font-normal ml-0.5">/day</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#97979d] uppercase tracking-wider block">
              UNITS DISPATCHED
            </span>
            <span className="font-semibold text-[#d4a853] tabular-nums mt-0.5 block">
              {unitsSold.toLocaleString()}
              <span className="text-[10px] text-[#97979d] font-normal ml-0.5">units</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroKPI;
