import { useState } from "react";
import { Link } from "react-router-dom";
import { useStockoutRisks } from "../hooks/useStockoutRisks";
import { useDeadStockScores } from "../hooks/useDeadStock";
import { useCreatePurchaseOrder } from "../hooks/usePurchaseOrders";
import { getExpiringBatches } from "../lib/batchExpiryStorage";
import type { StockoutPrediction } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";
import EmptyState from "../components/states/EmptyState";

type FilterTab = "all" | "stockout" | "perishable" | "dead_stock";

function AtRiskInventoryPage() {
  const storeId = localStorage.getItem("stockpilot_store_id") || "default";

  const {
    data: stockoutRisks,
    isLoading: loadingStockouts,
    isError: errorStockouts,
    refetch: refetchStockouts,
  } = useStockoutRisks();

  const {
    data: deadStockScores,
    isLoading: loadingDeadStock,
    isError: errorDeadStock,
    refetch: refetchDeadStock,
  } = useDeadStockScores();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [reorderProduct, setReorderProduct] = useState<StockoutPrediction | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expiringBatches = getExpiringBatches(storeId, 7);

  // 1. Critical Stockouts (<= 3 days or critical/high)
  const criticalStockouts = (stockoutRisks || []).filter(
    (s) =>
      s.riskLevel === "critical" ||
      s.riskLevel === "high" ||
      (s.daysUntilStockout !== null && Number(s.daysUntilStockout) <= 3)
  );

  // 2. High-Severity Dead Stock (score >= 50)
  const severeDeadStock = (deadStockScores || []).filter(
    (d) => d.score >= 50
  );

  // Calculate totals
  const totalImmobilizedCapital = severeDeadStock.reduce(
    (acc, d) => acc + Number(d.inventoryValue || 0),
    0
  );
  const totalExpiringUnits = expiringBatches.reduce((acc, b) => acc + b.quantity, 0);

  const isLoading = loadingStockouts || loadingDeadStock;
  const isError = errorStockouts || errorDeadStock;

  // Filter items based on activeTab & search
  const filteredStockouts = criticalStockouts.filter((item) =>
    searchTerm.trim() === "" ||
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpiring = expiringBatches.filter((item) =>
    searchTerm.trim() === "" ||
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeadStock = severeDeadStock.filter((item) =>
    searchTerm.trim() === "" ||
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAtRiskCount =
    criticalStockouts.length + expiringBatches.length + severeDeadStock.length;

  const handleExportCSV = () => {
    const lines = [
      "RiskType,ProductName,Identifier,CurrentStock,ThreatDetails,FinancialImpact",
    ];

    criticalStockouts.forEach((s) => {
      lines.push(
        `"STOCKOUT","${s.productName}","${s.productId}",${s.currentStock},"${s.daysUntilStockout} days remaining (Risk: ${s.riskLevel})","Lost Sales Threat"`
      );
    });

    expiringBatches.forEach((b) => {
      lines.push(
        `"PERISHABLE_EXPIRY","${b.productName}","${b.batchNumber} / ${b.sku}",${b.quantity},"Expires on ${b.expiryDate} (${b.daysRemaining}d left)","Spoilage Risk"`
      );
    });

    severeDeadStock.forEach((d) => {
      lines.push(
        `"DEAD_STOCK","${d.productName}","${d.productId}",${d.currentStock},"Stagnation Score: ${d.score}","₹${d.inventoryValue} Immobilized"`
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stockpilot_at_risk_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* ─── Back to Inventory ─── */}
      <Link
        to="/inventory"
        className="inline-flex items-center gap-1.5 text-xs text-[#97979d] hover:text-[#e8e6e3] transition-colors mb-3 cursor-pointer group"
      >
        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Inventory</span>
      </Link>

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#d45a4a]/10 border border-[#d45a4a]/25 text-[10px] uppercase tracking-wider text-[#d45a4a] font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d45a4a]" />
            Risk Monitor
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3]">
            At-Risk Inventory
          </h1>
          <p className="mt-1 text-xs text-[#97979d] font-sans">
            Monitor imminent stockouts, expiring batches, and slow-moving inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1a1a22] hover:bg-[#22222c] border border-white/10 text-[#e8e6e3] transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export At-Risk Audit CSV"
          >
            <span>📥 Export Risk CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Compact Metrics Strip ─── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#d45a4a] font-medium block">IMMINENT STOCKOUTS</span>
          <p className="text-xl font-bold text-[#d45a4a] tabular-nums mt-0.5">
            {criticalStockouts.length} <span className="text-xs font-normal text-[#71717a]">SKUs</span>
          </p>
          <p className="text-[10px] text-[#71717a] mt-0.5 font-sans">Depleting within 3 days</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#f59e0b] font-medium block">EXPIRING PERISHABLES</span>
          <p className="text-xl font-bold text-[#f59e0b] tabular-nums mt-0.5">
            {expiringBatches.length} <span className="text-xs font-normal text-[#71717a]">Batches</span>
          </p>
          <p className="text-[10px] text-[#71717a] mt-0.5 font-sans">{totalExpiringUnits} units &lt; 7d left</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#38bdf8] font-medium block">TIED-UP CAPITAL</span>
          <p className="text-xl font-bold text-[#38bdf8] tabular-nums mt-0.5">
            ₹{totalImmobilizedCapital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-[#71717a] mt-0.5 font-sans">{severeDeadStock.length} stagnant SKUs</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#e8e6e3] font-medium block">TOTAL AT-RISK</span>
          <p className="text-xl font-bold text-[#e8e6e3] tabular-nums mt-0.5">
            {totalAtRiskCount} <span className="text-xs font-normal text-[#71717a]">Items</span>
          </p>
          <p className="text-[10px] text-[#71717a] mt-0.5 font-sans">Action required</p>
        </div>
      </div>

      {/* ─── Search & Tab Filters ─── */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121216] border border-white/8 rounded-lg self-start">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#d4a853] text-[#0c0c0e]"
                : "text-[#97979d] hover:text-[#e8e6e3]"
            }`}
          >
            All ({totalAtRiskCount})
          </button>
          <button
            onClick={() => setActiveTab("stockout")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "stockout"
                ? "bg-[#d45a4a] text-white"
                : "text-[#97979d] hover:text-[#d45a4a]"
            }`}
          >
            Stockouts ({criticalStockouts.length})
          </button>
          <button
            onClick={() => setActiveTab("perishable")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "perishable"
                ? "bg-[#f59e0b] text-[#0c0c0e]"
                : "text-[#97979d] hover:text-[#f59e0b]"
            }`}
          >
            Perishables ({expiringBatches.length})
          </button>
          <button
            onClick={() => setActiveTab("dead_stock")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "dead_stock"
                ? "bg-[#38bdf8] text-[#0c0c0e]"
                : "text-[#97979d] hover:text-[#38bdf8]"
            }`}
          >
            Dead Stock ({severeDeadStock.length})
          </button>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by product, SKU, or batch..."
          className="w-full sm:w-72 bg-[#121216] border border-white/8 focus:border-[#d4a853] rounded-lg px-3.5 py-1.5 text-xs text-[#e8e6e3] placeholder-[#5c5c64] outline-none transition-colors"
        />
      </div>

      {/* ─── Content Rows ─── */}
      <div className="mt-4">
        {isLoading && <LoadingState message="Scanning store threat telemetry..." />}
        {isError && (
          <ErrorState
            onRetry={() => {
              refetchStockouts();
              refetchDeadStock();
            }}
          />
        )}

        {!isLoading && !isError && totalAtRiskCount === 0 && (
          <EmptyState
            title="Store inventory is healthy"
            description="Zero critical stockouts, zero expired batches, and healthy turnover velocity across all catalog SKUs."
          />
        )}

        {!isLoading && !isError && totalAtRiskCount > 0 && (
          <div className="space-y-4">
            {/* Section 1: Stockout Risks */}
            {(activeTab === "all" || activeTab === "stockout") && filteredStockouts.length > 0 && (
              <div className="border border-white/8 rounded-xl bg-[#121216]/90 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-[#16161d] border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔴</span>
                    <h2 className="text-xs font-bold text-[#e8e6e3] uppercase tracking-wider">
                      Imminent Stockout Depletion
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#d45a4a] font-bold">
                    {filteredStockouts.length} item(s)
                  </span>
                </div>

                <div className="divide-y divide-white/4">
                  {filteredStockouts.map((item) => {
                    const isExpanded = !!expandedIds[item.id];
                    return (
                      <div key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <div
                          onClick={() => toggleExpand(item.id)}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-[#e8e6e3] text-xs">
                              {item.productName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/25">
                              {item.riskLevel.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setReorderProduct(item)}
                              className="px-3 py-1 rounded-lg bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              ⚡ Reorder Stock
                            </button>
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-[#e8e6e3] text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? "Hide" : "Details"}</span>
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expandable info on click */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 text-xs text-[#97979d] bg-white/[0.01] border-t border-white/[0.03] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150 font-sans">
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Current Stock</span>
                              <strong className="text-rose-400 font-semibold">{item.currentStock} units</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Daily Run-Rate</span>
                              <strong className="text-[#e8e6e3]">{Number(item.forecastedDailyDemand || 0).toFixed(1)}/day</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Depletion Runway</span>
                              <strong className="text-amber-400">
                                {item.daysUntilStockout ? `${Number(item.daysUntilStockout).toFixed(1)} days left` : "Imminent"}
                              </strong>
                            </div>
                            <div className="flex items-center">
                              <Link
                                to={`/products/${item.productId}`}
                                className="text-xs text-[#d4a853] hover:underline"
                              >
                                View Product Specs →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Expiring Perishables */}
            {(activeTab === "all" || activeTab === "perishable") && filteredExpiring.length > 0 && (
              <div className="border border-white/8 rounded-xl bg-[#121216]/90 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-[#16161d] border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">⏳</span>
                    <h2 className="text-xs font-bold text-[#e8e6e3] uppercase tracking-wider">
                      Perishable Batches Nearing Expiry (&le; 7 Days)
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#f59e0b] font-bold">
                    {filteredExpiring.length} batch(es)
                  </span>
                </div>

                <div className="divide-y divide-white/4">
                  {filteredExpiring.map((b) => {
                    const isExpanded = !!expandedIds[b.id];
                    return (
                      <div key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <div
                          onClick={() => toggleExpand(b.id)}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-[#e8e6e3] text-xs">
                              {b.productName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {b.daysRemaining <= 0 ? "Expires Today" : `${b.daysRemaining}d remaining`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                            <Link
                              to="/pos"
                              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0c0c0e] font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                              title="Open POS billing screen to discount or sell batch"
                            >
                              Sell at Counter
                            </Link>
                            <Link
                              to="/inventory"
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-[#e8e6e3] text-xs transition-colors cursor-pointer"
                              title="Go to inventory to adjust stock"
                            >
                              Adjust Stock
                            </Link>
                            <button
                              onClick={() => toggleExpand(b.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-[#e8e6e3] text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? "Hide" : "Details"}</span>
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expandable batch info */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 text-xs text-[#97979d] bg-white/[0.01] border-t border-white/[0.03] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150 font-sans">
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Batch Lot</span>
                              <strong className="text-[#e8e6e3] font-semibold">{b.batchNumber}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Shelf Count</span>
                              <strong className="text-amber-300">{b.quantity} units</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Expiration Date</span>
                              <strong className="text-rose-400">{b.expiryDate}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">SKU Code</span>
                              <span className="text-[#e8e6e3] font-mono">{b.sku}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Dead Stock Capital */}
            {(activeTab === "all" || activeTab === "dead_stock") && filteredDeadStock.length > 0 && (
              <div className="border border-white/8 rounded-xl bg-[#121216]/90 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-[#16161d] border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🧊</span>
                    <h2 className="text-xs font-bold text-[#e8e6e3] uppercase tracking-wider">
                      Immobilized Capital / Stagnant Inventory
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#38bdf8] font-bold">
                    {filteredDeadStock.length} stagnant SKU(s)
                  </span>
                </div>

                <div className="divide-y divide-white/4">
                  {filteredDeadStock.map((d) => {
                    const isExpanded = !!expandedIds[d.id];
                    return (
                      <div key={d.id} className="hover:bg-white/[0.02] transition-colors">
                        <div
                          onClick={() => toggleExpand(d.id)}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-[#e8e6e3] text-xs">
                              {d.productName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
                              Stagnation: {d.score}/100
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                            <Link
                              to="/dead-stock"
                              className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-[#0c0c0e] font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Discount & Clear
                            </Link>
                            <button
                              onClick={() => toggleExpand(d.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-[#e8e6e3] text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? "Hide" : "Details"}</span>
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expandable dead stock info */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 text-xs text-[#97979d] bg-white/[0.01] border-t border-white/[0.03] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150 font-sans">
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Unsold Stock</span>
                              <strong className="text-[#e8e6e3] font-semibold">{d.currentStock} units</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Tied-Up Capital</span>
                              <strong className="text-sky-300">₹{Number(d.inventoryValue || 0).toLocaleString()}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Days Without Sale</span>
                              <strong className="text-amber-300">{d.daysSinceLastSale ?? 30}+ days</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#71717a] block">Product ID</span>
                              <span className="text-[#71717a] font-mono text-[11px] truncate block">{d.productId}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 1-Click Reorder Modal ─── */}
      {reorderProduct && (
        <QuickReorderModal
          item={reorderProduct}
          onClose={() => setReorderProduct(null)}
        />
      )}
    </div>
  );
}

/** Lightweight Reorder Modal for immediate PO creation */
function QuickReorderModal({
  item,
  onClose,
}: {
  item: StockoutPrediction;
  onClose: () => void;
}) {
  const createPO = useCreatePurchaseOrder();
  const [quantity, setQuantity] = useState(20);
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (item.leadTimeDays || 3));
    return d.toISOString().split("T")[0];
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPO.mutateAsync({
        productId: item.productId,
        quantity,
        expectedArrivalDate: expectedDate,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create purchase order.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-white/12 rounded-xl w-full max-w-md p-6 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-white/6">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h2 className="font-bold text-sm text-[#e8e6e3]">1-Click Restock PO</h2>
          </div>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3] cursor-pointer">
            ✕
          </button>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-[#0a0a0c] border border-white/8 space-y-1 text-xs">
          <p className="font-bold text-[#e8e6e3]">{item.productName}</p>
          <div className="flex justify-between text-[#71717a] text-[11px]">
            <span>Current Stock: <strong className="text-[#d45a4a]">{item.currentStock} units</strong></span>
            <span>Runway: <strong className="text-[#f59e0b]">{Number(item.daysUntilStockout || 0).toFixed(1)} days</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              Restock Quantity (Units)
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none tabular-nums"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none tabular-nums"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-[#d45a4a] bg-[#d45a4a]/10 border border-[#d45a4a]/30 p-2 rounded">
              {errorMsg}
            </p>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#97979d] hover:text-[#e8e6e3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPO.isPending}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {createPO.isPending ? "Issuing..." : "Issue PO Immediately"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AtRiskInventoryPage;
