import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInventory, useAdjustStock } from "../hooks/useInventory";
import { useCategories } from "../hooks/useProducts";
import { useStoreSettings } from "../hooks/useSettings";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

interface AuditRowState {
  physicalCount: number | "";
  reason: "theft" | "damage" | "correction" | "manual_adjustment";
  note: string;
  isReconciled?: boolean;
}

export default function StockAuditPage() {
  const { data: inventory = [], isLoading, isError, refetch } = useInventory();
  const { data: categories = [] } = useCategories();
  const { data: store } = useStoreSettings();
  const currency = store?.currency === "USD" ? "$" : store?.currency === "EUR" ? "€" : store?.currency === "GBP" ? "£" : "₹";
  const adjustStockMutation = useAdjustStock();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterView, setFilterView] = useState<"all" | "discrepancies" | "matched">("all");

  // Audit state per product: Record<productId, AuditRowState>
  const [auditData, setAuditData] = useState<Record<string, AuditRowState>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Set initial physical count equal to current stock for convenience
  const handlePhysicalCountChange = (productId: string, val: string) => {
    const num = val === "" ? "" : Number(val);
    setAuditData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        physicalCount: num,
        reason: prev[productId]?.reason || "theft",
        note: prev[productId]?.note || "",
      },
    }));
  };

  const handleReasonChange = (productId: string, reason: AuditRowState["reason"]) => {
    setAuditData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        reason,
        physicalCount: prev[productId]?.physicalCount ?? "",
        note: prev[productId]?.note || "",
      },
    }));
  };

  // Filtered Inventory List
  const items = useMemo(() => {
    return inventory.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesBarcode = item.barcode?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }

      // Filter view
      const state = auditData[item.productId];
      const hasCount = state && typeof state.physicalCount === "number";
      const systemStock = item.currentStock;
      const physicalStock = hasCount ? state.physicalCount : systemStock;
      const isDiscrepant = hasCount && physicalStock !== systemStock;

      if (filterView === "discrepancies") return isDiscrepant;
      if (filterView === "matched") return hasCount && physicalStock === systemStock;

      return true;
    });
  }, [inventory, selectedCategory, searchQuery, filterView, auditData]);

  // Discrepancy KPI calculations
  const stats = useMemo(() => {
    let auditedCount = 0;
    let discrepanciesCount = 0;
    let totalLossValue = 0;
    let totalSurplusValue = 0;

    inventory.forEach((item) => {
      const state = auditData[item.productId];
      if (state && typeof state.physicalCount === "number") {
        auditedCount++;
        const diff = state.physicalCount - item.currentStock;
        const unitCost = Number(item.costPrice || item.sellingPrice || 0);

        if (diff < 0) {
          discrepanciesCount++;
          totalLossValue += Math.abs(diff) * unitCost;
        } else if (diff > 0) {
          discrepanciesCount++;
          totalSurplusValue += diff * unitCost;
        }
      }
    });

    return {
      auditedCount,
      discrepanciesCount,
      totalLossValue,
      totalSurplusValue,
    };
  }, [inventory, auditData]);

  // Handler: 1-Click Reconcile for a single product
  const handleReconcileSingle = async (productId: string, productName: string, systemStock: number) => {
    const row = auditData[productId];
    if (!row || typeof row.physicalCount !== "number") {
      alert("Please enter a physical count first.");
      return;
    }

    const difference = row.physicalCount - systemStock;
    if (difference === 0) {
      setActionNotice(`✓ Count for ${productName} matches system stock (${systemStock}). No adjustment needed.`);
      setTimeout(() => setActionNotice(null), 3000);
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        productId,
        quantityChange: difference,
        reason: row.reason === "theft" ? "correction" : row.reason,
        note: `Physical Audit: Shelf had ${row.physicalCount}, System had ${systemStock}. Reason: ${row.reason.toUpperCase()}`,
      });

      setAuditData((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          isReconciled: true,
        },
      }));

      setActionNotice(`✓ Reconciled ${productName}! Stock updated from ${systemStock} to ${row.physicalCount}.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to reconcile stock: " + (err.message || "Unknown error"));
    }
  };

  // Handler: Reconcile ALL Discrepancies
  const handleReconcileAll = async () => {
    const toReconcile: { productId: string; diff: number; reason: string; physical: number; system: number; name: string }[] = [];

    inventory.forEach((item) => {
      const row = auditData[item.productId];
      if (row && typeof row.physicalCount === "number" && !row.isReconciled) {
        const diff = row.physicalCount - item.currentStock;
        if (diff !== 0) {
          toReconcile.push({
            productId: item.productId,
            diff,
            reason: row.reason,
            physical: row.physicalCount,
            system: item.currentStock,
            name: item.productName || "Product",
          });
        }
      }
    });

    if (toReconcile.length === 0) {
      alert("No unreconciled discrepancies found to process.");
      return;
    }

    const confirmAll = window.confirm(
      `Reconcile ${toReconcile.length} item discrepancies? This will immediately update your inventory stock count.`
    );
    if (!confirmAll) return;

    for (const item of toReconcile) {
      try {
        await adjustStockMutation.mutateAsync({
          productId: item.productId,
          quantityChange: item.diff,
          reason: item.reason === "theft" ? "correction" : item.reason,
          note: `Bulk Physical Audit: Shelf had ${item.physical}, System had ${item.system}`,
        });
      } catch (err) {
        console.error("Failed to reconcile", item.name, err);
      }
    }

    // Mark all as reconciled
    setAuditData((prev) => {
      const next = { ...prev };
      toReconcile.forEach((i) => {
        if (next[i.productId]) {
          next[i.productId].isReconciled = true;
        }
      });
      return next;
    });

    setActionNotice(`✓ Successfully reconciled ${toReconcile.length} items!`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto select-none min-h-screen font-mono">
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

      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#d4a853]/10 border border-[#d4a853]/25 text-[10px] uppercase tracking-wider text-[#d4a853] font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
            Stock Audit
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#f4f4f5] tracking-tight">
            Aisle Stock Audit & Reconciliation
          </h1>
          <p className="text-xs text-[#97979d] mt-1 font-sans">
            Compare actual shelf counts with system stock, detect theft/breakage, and adjust ledger in 1 click.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stats.discrepanciesCount > 0 && (
            <button
              onClick={handleReconcileAll}
              disabled={adjustStockMutation.isPending}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>⚡ Reconcile All Discrepancies ({stats.discrepanciesCount})</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── Compact KPI Cards ─── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#71717a] font-medium block">ITEMS COUNTED</span>
          <span className="text-xl font-bold text-[#e8e6e3] tabular-nums mt-0.5 block">
            {stats.auditedCount} <span className="text-xs font-normal text-[#71717a]">/ {inventory.length}</span>
          </span>
          <span className="text-[10px] text-[#71717a] mt-0.5 block font-sans">Physical audit progress</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-rose-400 font-medium block">DISCREPANCIES</span>
          <span className="text-xl font-bold text-rose-400 tabular-nums mt-0.5 block">
            {stats.discrepanciesCount} <span className="text-xs font-normal text-[#71717a]">items</span>
          </span>
          <span className="text-[10px] text-[#71717a] mt-0.5 block font-sans">Stock mismatches</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-rose-400 font-medium block">SHRINKAGE LOSS</span>
          <span className="text-xl font-bold text-rose-400 tabular-nums mt-0.5 block">
            {currency}{stats.totalLossValue.toFixed(0)}
          </span>
          <span className="text-[10px] text-[#71717a] mt-0.5 block font-sans">Missing stock value</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-sky-400 font-medium block">SURPLUS STOCK</span>
          <span className="text-xl font-bold text-sky-400 tabular-nums mt-0.5 block">
            {currency}{stats.totalSurplusValue.toFixed(0)}
          </span>
          <span className="text-[10px] text-[#71717a] mt-0.5 block font-sans">Extra physical stock</span>
        </div>
      </div>

      {/* ─── Search & Category Filters ─── */}
      <div className="mt-5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* View Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121218] border border-white/10 self-start md:self-auto">
          {[
            { id: "all", label: `All Items (${inventory.length})` },
            { id: "discrepancies", label: `⚠️ Discrepancies (${stats.discrepanciesCount})` },
            { id: "matched", label: `✓ Matched` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterView(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterView === tab.id
                  ? "bg-[#d4a853] text-[#0c0c0e] font-bold shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#121218] text-[#f4f4f5] border border-white/10 outline-none focus:border-[#d4a853] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item, SKU or barcode..."
            className="w-full md:w-64 px-3 py-1.5 rounded-lg text-xs bg-[#121218] text-[#f4f4f5] border border-white/10 focus:border-[#d4a853] outline-none"
          />
        </div>
      </div>

      {/* ─── Audit Sheet Table ─── */}
      <div className="mt-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState message="Loading inventory items..." />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState onRetry={() => refetch()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161620] text-[#71717a] font-semibold uppercase tracking-wider border-b border-white/8">
                <tr>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">System Stock</th>
                  <th className="py-3.5 px-4">Physical Count (Shelf)</th>
                  <th className="py-3.5 px-4">Discrepancy / Variance</th>
                  <th className="py-3.5 px-4">Adjustment Reason</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#71717a] font-sans">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const row = auditData[item.productId];
                    const hasPhysicalCount = row && typeof row.physicalCount === "number";
                    const physicalStock = hasPhysicalCount ? (row.physicalCount as number) : item.currentStock;
                    const diff = physicalStock - item.currentStock;
                    const unitPrice = Number(item.sellingPrice || 0);
                    const financialImpact = Math.abs(diff) * unitPrice;

                    return (
                      <tr key={item.productId} className="hover:bg-white/[0.02] transition-colors">
                        {/* Product Info */}
                        <td className="py-3 px-4 font-sans">
                          <span className="font-bold text-[#f4f4f5] block">{item.productName}</span>
                          <span className="text-[10px] text-[#71717a] font-mono">
                            {item.sku} {item.barcode ? `• ${item.barcode}` : ""}
                          </span>
                        </td>

                        {/* System Stock */}
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#f4f4f5] font-bold">
                            {item.currentStock} pcs
                          </span>
                        </td>

                        {/* Physical Count Input */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              placeholder={String(item.currentStock)}
                              value={row?.physicalCount ?? ""}
                              onChange={(e) => handlePhysicalCountChange(item.productId, e.target.value)}
                              className="w-24 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
                            />
                            <span className="text-[10px] text-[#71717a]">counted</span>
                          </div>
                        </td>

                        {/* Discrepancy / Variance */}
                        <td className="py-3 px-4 font-sans">
                          {!hasPhysicalCount ? (
                            <span className="text-[11px] text-[#71717a]">Pending Count</span>
                          ) : diff === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ Matched ({item.currentStock})
                            </span>
                          ) : diff < 0 ? (
                            <div className="flex flex-col">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 w-fit">
                                🔴 {diff} Missing
                              </span>
                              <span className="text-[10px] text-rose-400/90 font-mono mt-0.5">
                                Loss: {currency}{financialImpact.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 w-fit">
                                🔵 +{diff} Extra Found
                              </span>
                              <span className="text-[10px] text-sky-400 font-mono mt-0.5">
                                Surplus: {currency}{financialImpact.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Reason Dropdown */}
                        <td className="py-3 px-4 font-sans">
                          {diff !== 0 && hasPhysicalCount ? (
                            <select
                              value={row?.reason || "theft"}
                              onChange={(e) => handleReasonChange(item.productId, e.target.value as any)}
                              className="px-2.5 py-1 rounded-lg text-[11px] bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853] cursor-pointer"
                            >
                              <option value="theft">Theft / Pilferage</option>
                              <option value="damage">Damaged / Broken</option>
                              <option value="correction">Counting Error</option>
                              <option value="manual_adjustment">Found Misplaced</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-[#71717a]">—</span>
                          )}
                        </td>

                        {/* Reconcile Button */}
                        <td className="py-3 px-4 text-right font-sans">
                          {row?.isReconciled ? (
                            <span className="text-[11px] font-bold text-emerald-400">
                              ✓ Reconciled
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                handleReconcileSingle(
                                  item.productId,
                                  item.productName || "Product",
                                  item.currentStock
                                )
                              }
                              disabled={!hasPhysicalCount || adjustStockMutation.isPending}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-[#d4a853] hover:text-[#0c0c0e] bg-[#d4a853]/10 hover:bg-[#d4a853] border border-[#d4a853]/30 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                            >
                              Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
