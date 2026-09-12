import AnimatedNumber from "../motion/AnimatedNumber";

interface MetricTileProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  sublabel?: string;
}

/**
 * Supporting metric tile — secondary to HeroKPI.
 * Frosted dark surface, glowing ambient accents, JetBrains Mono values.
 */
function MetricTile({ label, value, format, sublabel }: MetricTileProps) {
  return (
    <div
      className="group relative transition-all duration-300 sp-glass rounded-xl p-5 hover:border-[rgba(212,168,83,0.35)] hover:shadow-[0_12px_35px_-8px_rgba(0,0,0,0.8),0_0_20px_rgba(212,168,83,0.1)] hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Top ambient highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.12)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <p className="sp-label" style={{ fontSize: "0.625rem", letterSpacing: "0.12em" }}>
          {label}
        </p>
        <span className="w-1.5 h-1.5 rounded-full bg-[#303035] group-hover:bg-[#d4a853] transition-colors" />
      </div>

      <div className="mt-2.5">
        <AnimatedNumber
          value={value}
          format={format ?? ((n) => n.toLocaleString("en-IN"))}
          className="text-2xl font-bold font-mono tracking-tight text-[#e8e6e3]"
          duration={900}
        />
      </div>

      {sublabel && (
        <p className="mt-1.5 font-mono text-[11px] text-[#5c5c64]">
          {sublabel}
        </p>
      )}
    </div>
  );
}

export default MetricTile;
