import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "../lib/apiClient";
import type { Product } from "../lib/types";
import { useRunSimulation } from "../hooks/useSimulator";

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SimulatorPage() {
  const { data: products } = useQuery({
    queryKey: ["products-for-simulator"],
    queryFn: () => apiClient.get<Product[]>("/api/products?pageSize=100"),
  });

  const [productId, setProductId] = useState("");
  const [demandChange, setDemandChange] = useState("0");
  const [supplierDelay, setSupplierDelay] = useState("0");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const simulate = useRunSimulation();

  async function handleRun() {
    setError(null);
    if (!productId) {
      setError("Please select a product.");
      return;
    }
    try {
      await simulate.mutateAsync({
        productId,
        demandChangePercent: Number(demandChange),
        supplierDelayDays: Number(supplierDelay),
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const result = simulate.data;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
          DECISION INTELLIGENCE
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
          What-If Scenario Simulator
        </h1>
        <p className="mt-1 text-xs font-mono text-[#97979d]">
          Model supply chain disruptions, demand spikes, and lead time shifts without modifying production ledger records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Simulation Configuration Form */}
        <div className="lg:col-span-5 bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#e8e6e3] pb-3 border-b border-[rgba(255,255,255,0.06)]">
            Scenario Parameters
          </h3>

          <div className="flex flex-col gap-4 mt-4 font-mono text-xs">
            <div>
              <label className="text-[#97979d] block mb-1">TARGET SKU</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              >
                <option value="" className="bg-[#121216] text-[#97979d]">Select a product...</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#121216] text-[#e8e6e3]">
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#97979d] block mb-1">
                DEMAND VARIATION (%)
              </label>
              <input
                type="number"
                value={demandChange}
                onChange={(e) => setDemandChange(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
                placeholder="e.g. 25 for +25%, -15 for -15%"
              />
            </div>

            <div>
              <label className="text-[#97979d] block mb-1">
                SUPPLIER TRANSIT DELAY (DAYS)
              </label>
              <input
                type="number"
                value={supplierDelay}
                onChange={(e) => setSupplierDelay(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
                placeholder="e.g. 5 days delay"
              />
            </div>

            <div>
              <label className="text-[#97979d] block mb-1">
                BUDGET CEILING (OPTIONAL ₹)
              </label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
                placeholder="e.g. 50000"
              />
            </div>

            {error && <p className="text-xs text-[#d45a4a] mt-1">{error}</p>}

            <button
              onClick={handleRun}
              disabled={simulate.isPending}
              className="mt-2 w-full py-2.5 rounded-lg bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold transition-all shadow-[0_0_20px_rgba(212,168,83,0.25)] active:scale-95 disabled:opacity-50"
            >
              {simulate.isPending ? "Executing Monte Carlo Simulation..." : "Run Simulation Model →"}
            </button>
          </div>
        </div>

        {/* Simulation Output Dashboard */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#6b8cc7]/15 text-[#6b8cc7] border border-[#6b8cc7]/30 font-semibold">
                  SIMULATION RESULT // ISOLATED SANDBOX
                </span>
                <span className="text-[11px] font-mono text-[#4aba7a]">
                  ZERO PRODUCTION IMPACT
                </span>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-2 gap-6 mt-5 font-mono text-xs">
                <div className="p-4 rounded-lg bg-[#0d0d10] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-[10px] text-[#5c5c64] uppercase tracking-wider block mb-2 font-bold">
                    PRODUCTION BASELINE
                  </span>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Current Stock:</span>
                      <span className="text-[#e8e6e3] font-bold">{result.baselineCurrentStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Daily Velocity:</span>
                      <span className="text-[#e8e6e3]">{Number(result.baselineAverageDailyDemand).toFixed(2)} /d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Lead Time:</span>
                      <span className="text-[#e8e6e3]">{result.baselineLeadTimeDays ?? "—"} days</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#181822] border border-[rgba(212,168,83,0.3)] shadow-[0_0_20px_rgba(212,168,83,0.08)]">
                  <span className="text-[10px] text-[#d4a853] uppercase tracking-wider block mb-2 font-bold">
                    SIMULATED PROJECTION
                  </span>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Adjusted Demand:</span>
                      <span className="text-[#d4a853] font-bold">{Number(result.simulatedAverageDailyDemand).toFixed(2)} /d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Projected Delay:</span>
                      <span className="text-[#d4a853]">{result.simulatedLeadTimeDays ?? "—"} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#97979d]">Required Buffer:</span>
                      <span className="text-[#e8e6e3] font-bold">{result.simulatedSafetyStock} units</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Targets */}
              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 gap-4 font-mono">
                <div className="p-3 bg-[#0d0d10] rounded-lg">
                  <span className="text-[10px] text-[#97979d] block">TRIGGER REORDER AT</span>
                  <span className="text-xl font-bold text-[#e8e6e3]">
                    {result.simulatedReorderPoint ?? "—"} Units
                  </span>
                </div>
                <div className="p-3 bg-[#0d0d10] rounded-lg">
                  <span className="text-[10px] text-[#97979d] block">RECOMMENDED PO SIZE</span>
                  <span className="text-xl font-bold text-[#d4a853]">
                    {result.simulatedRecommendedQuantity} Units
                  </span>
                </div>
              </div>

              {/* Financial Impact */}
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[#97979d]">Estimated PO Outlay: </span>
                  <span className={`font-bold ${result.budgetExceeded ? "text-[#d45a4a]" : "text-[#4aba7a]"}`}>
                    {result.estimatedCost ? formatCurrency(Number(result.estimatedCost)) : "—"}
                    {result.budgetExceeded && " (EXCEEDS SPECIFIED CEILING)"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#97979d]">Stockout Horizon: </span>
                  <span className="font-bold text-[#e8e6e3]">
                    {result.simulatedDaysUntilStockout !== null
                      ? `~${Number(result.simulatedDaysUntilStockout).toFixed(1)} Days`
                      : "Sufficient"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl flex flex-col items-center justify-center p-8 text-center">
              <span className="text-2xl mb-2">⚡</span>
              <h4 className="text-sm font-semibold text-[#e8e6e3]">Awaiting Simulation Trigger</h4>
              <p className="text-xs font-mono text-[#97979d] mt-1 max-w-sm">
                Select an SKU on the left and specify stress variables to compute hypothetical stockout trajectories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimulatorPage;