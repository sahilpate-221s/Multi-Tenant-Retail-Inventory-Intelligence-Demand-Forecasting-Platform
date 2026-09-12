import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function AppFooter() {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${hours}:${minutes}:${seconds}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      className="mt-auto shrink-0 w-full bg-[#0c0c0f]/90 backdrop-blur-xl py-2 px-6 border-t border-[rgba(255,255,255,0.06)] select-none z-20 text-xs"
      style={{
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Facility & Sync status */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#97979d]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a]" />
            <span className="text-[#e8e6e3] font-medium">Ledger Connected</span>
          </div>
          <span className="text-[#303035]">•</span>
          <span className="text-[#5c5c64] hidden md:inline">
            Warehouse 01 (Primary Fulfillment)
          </span>
          <span className="text-[#303035] hidden md:inline">•</span>
          <span className="text-[#5c5c64]">Latency: 18ms</span>
        </div>

        {/* Center: Command Palette Hint */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-[#5c5c64]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#1b1b22] text-[#97979d] border border-[#2d2d35]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#1b1b22] text-[#97979d] border border-[#2d2d35]">
              K
            </kbd>
            <span className="ml-1 text-[#97979d]">Command Palette</span>
          </span>
        </div>

        {/* Right: Clock & Quick Navigation */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="text-[#97979d] flex items-center gap-1.5">
            <span className="text-[#5c5c64]">LOCAL:</span>
            <span className="text-[#d4a853] tabular-nums font-semibold">
              {timeStr || "00:00:00"}
            </span>
          </div>

          <span className="text-[#303035] hidden sm:inline">|</span>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-[#97979d] hover:text-[#d4a853] transition-colors"
            >
              Console
            </Link>
            <Link
              to="/settings"
              className="text-[#97979d] hover:text-[#d4a853] transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
