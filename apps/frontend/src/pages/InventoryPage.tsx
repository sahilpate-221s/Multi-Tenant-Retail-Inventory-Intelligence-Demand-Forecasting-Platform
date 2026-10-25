import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "../hooks/useInventory";
import { useCategories } from "../hooks/useProducts";
import { useAuth } from "../lib/authContext";
import { getExpiringBatches } from "../lib/batchExpiryStorage";
import type { InventoryItem } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import AdjustStockModal from "../components/inventory/AdjustStockModal";
import MovementHistoryModal from "../components/inventory/MovementHistoryModal";
import ProductFormModal from "../components/products/ProductFormModal";

const ITEMS_PER_PAGE = 25;

function InventoryPage() {
  const { data: inventory, isLoading, isError, refetch } = useInventory();
  const { data: categories } = useCategories();

  const { user } = useAuth();
  const storeId = user?.storeId || "default";

  const [isCashierMode, setIsCashierMode] = useState<boolean>(() => {
    return localStorage.getItem("sp_cashier_mode") === "true";
  });

  useEffect(() => {
    const handleCashierChange = () => {
      setIsCashierMode(localStorage.getItem("sp_cashier_mode") === "true");
    };
    window.addEventListener("cashier-mode-changed", handleCashierChange);
    return () => window.removeEventListener("cashier-mode-changed", handleCashierChange);
  }, []);

  const expiringBatches = useMemo(() => getExpiringBatches(storeId, 7), [storeId]);
  const expiringProductIds = useMemo(
    () => new Set(expiringBatches.map((b) => b.productId)),
    [expiringBatches]
  );

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setToolsMenuOpen(false);
      }
    }
    if (toolsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolsMenuOpen]);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!inventory) return { total: 0, lowStock: 0, outOfStock: 0, inStock: 0 };
    let lowStock = 0;
    let outOfStock = 0;
    for (const item of inventory) {
      if (item.currentStock <= 0) {
        outOfStock++;
      } else if (item.currentStock <= item.minStock) {
        lowStock++;
      }
    }
    return {
      total: inventory.length,
      outOfStock,
      lowStock,
      inStock: inventory.length - outOfStock - lowStock,
    };
  }, [inventory]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || item.categoryId === selectedCategory;

      const isLow = item.currentStock <= item.minStock;
      const matchesLowStock = !showLowStockOnly || isLow;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [inventory, search, selectedCategory, showLowStockOnly]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, validPage]);

  // Export filtered ledger to CSV
  function handleExportCsv() {
    if (!filteredItems.length) return;
    const headers = ["Product Name", "SKU", "Current Stock", "Min Stock", "Status"];
    const rows = filteredItems.map((item) => {
      const status = item.currentStock <= 0 ? "OUT_OF_STOCK" : item.currentStock <= item.minStock ? "LOW_STOCK" : "HEALTHY";
      return [
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.sku}"`,
        item.currentStock,
        item.minStock,
        status,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stockpilot_inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#d4a853]/10 border border-[#d4a853]/25 text-[10px] uppercase tracking-wider text-[#d4a853] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
            Store Inventory
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-1.5">
            Inventory Stock Ledger
          </h1>
          <p className="text-xs text-[#97979d] mt-1">
            Track shelf counts, safety thresholds, and log stock adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isCashierMode && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Product</span>
            </button>
          )}

          {/* Clean Tools & Actions Dropdown */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setToolsMenuOpen((prev) => !prev)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                toolsMenuOpen
                  ? "bg-[#1f1f2b] text-[#e8e6e3] border-[#d4a853]/50"
                  : "bg-[#14141c] hover:bg-[#1a1a24] text-[#b4b4bc] hover:text-[#e8e6e3] border-white/10"
              }`}
              title="Additional inventory tools and operations"
            >
              <span>Tools & Actions</span>
              <svg
                className={`w-3.5 h-3.5 text-[#97979d] transition-transform duration-200 ${
                  toolsMenuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {toolsMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#14141a]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 divide-y divide-white/6">
                <div className="space-y-0.5 pb-1">
                  {!isCashierMode && (
                    <>
                      <Link
                        to="/inventory/at-risk"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-xs font-medium text-[#e8e6e3] group-hover:text-[#f8d888] transition-colors">
                          At-Risk Cockpit
                        </span>
                      </Link>

                      <Link
                        to="/inventory/audit"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="text-xs font-medium text-[#e8e6e3] group-hover:text-[#f8d888] transition-colors">
                          Aisle Stock Audit
                        </span>
                      </Link>
                    </>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setToolsMenuOpen(false);
                      handleExportCsv();
                    }}
                    disabled={filteredItems.length === 0}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="text-xs font-medium text-[#e8e6e3] group-hover:text-[#f8d888] transition-colors">
                      Export CSV
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cashier Mode Alert Banner */}
      {isCashierMode && (
        <div className="mt-4 p-3 rounded-xl bg-[#d4a853]/10 border border-[#d4a853]/30 flex items-center justify-between text-xs text-[#d4a853]">
          <span className="flex items-center gap-2">
            <span>🔒</span>
            <span className="font-semibold">
              Cashier Mode Active: Displaying shelf stocks for customer lookups. Stock adjustments and catalog creation are locked to Store Owner.
            </span>
          </span>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#71717a] block font-medium">TOTAL TRACKED SKUs</span>
          <span className="text-xl font-bold text-[#e8e6e3] tabular-nums mt-0.5 block">
            {metrics.total.toLocaleString()}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-[#4aba7a] block font-medium">IN STOCK / HEALTHY</span>
          <span className="text-xl font-bold text-[#4aba7a] tabular-nums mt-0.5 block">
            {metrics.inStock.toLocaleString()}
          </span>
        </div>
        <div 
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            showLowStockOnly 
              ? "bg-[#d4a853]/15 border-[#d4a853] shadow-md shadow-[#d4a853]/10" 
              : "bg-[#121216] border-white/6 hover:border-[#d4a853]/40"
          }`}
          title="Click to toggle low stock filter"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[#d4a853] font-medium">BELOW SAFETY MIN</span>
            {showLowStockOnly && (
              <span className="text-[9px] bg-[#d4a853]/25 px-1.5 py-0.2 rounded text-[#d4a853] font-bold">
                FILTER ACTIVE
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-[#d4a853] tabular-nums mt-0.5 block">
            {metrics.lowStock.toLocaleString()}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/6">
          <span className="text-[10px] uppercase text-rose-400 block font-medium">OUT OF STOCK</span>
          <span className="text-xl font-bold text-rose-400 tabular-nums mt-0.5 block">
            {metrics.outOfStock.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 p-3 rounded-xl bg-[#14141a] border border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by product name or SKU..."
              className="w-full bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-1.5 text-xs text-[#e8e6e3] outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-[#e8e6e3] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#0a0a0d] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-1.5 text-xs text-[#e8e6e3] outline-none transition-colors cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <label className="flex items-center gap-2 text-xs text-[#97979d] hover:text-[#e8e6e3] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => {
                setShowLowStockOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="accent-[#d4a853] cursor-pointer w-3.5 h-3.5"
            />
            <span>Low Stock Alert Only</span>
          </label>

          <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/8 text-[11px] text-[#97979d] whitespace-nowrap">
            Showing <strong className="text-[#e8e6e3] font-semibold">{filteredItems.length}</strong> SKU{filteredItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="mt-4 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Querying real-time ledger..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && filteredItems.length === 0 && (
          <EmptyState
            title="No matching inventory records"
            description={
              search || selectedCategory !== "all" || showLowStockOnly
                ? "No products match the selected filters. Clear your search or filters to see all inventory."
                : "Stock levels will appear here as soon as products register inbound/outbound movements."
            }
          />
        )}
        {!isLoading && !isError && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">SKU Identifier</th>
                  <th className="px-5 py-3">Current Stock</th>
                  <th className="px-5 py-3">Safety Min</th>
                  <th className="px-5 py-3">Buffer Health</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {paginatedItems.map((item) => {
                  const isOutOfStock = item.currentStock <= 0;
                  const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-[#181822]/70 transition-colors group">
                      <td className="px-5 py-3.5 font-semibold text-[#e8e6e3]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{item.productName}</span>
                          {expiringProductIds.has(item.productId) && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title="Perishable batch expiring within 7 days"
                            >
                              <span>⏳</span>
                              <span>Expiring Soon</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d]">{item.sku}</td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span
                          className={
                            isOutOfStock
                              ? "text-rose-400 font-bold"
                              : isLow
                              ? "text-amber-400 font-bold"
                              : "text-[#e8e6e3] font-semibold"
                          }
                        >
                          {item.currentStock.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d] tabular-nums">
                        {item.minStock.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            In stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 hover:border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
                            title="View stock movement history"
                          >
                            <svg className="w-3.5 h-3.5 text-[#97979d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>History</span>
                          </button>
                          {!isCashierMode && (
                            <button
                              onClick={() => setAdjustingItem(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#d4a853] hover:text-[#f8d888] bg-[#d4a853]/10 hover:bg-[#d4a853]/20 border border-[#d4a853]/30 hover:border-[#d4a853]/50 transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Adjust on-hand inventory count"
                            >
                              <svg className="w-3.5 h-3.5 text-[#d4a853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Adjust</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/6 bg-[#0e0e12] text-xs">
                <span className="text-[#71717a]">
                  Page {validPage} of {totalPages} ({filteredItems.length} total SKUs)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="px-2.5 py-1 rounded bg-[#181822] border border-white/8 text-[#97979d] hover:text-[#e8e6e3] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="px-2.5 py-1 rounded bg-[#181822] border border-white/8 text-[#97979d] hover:text-[#e8e6e3] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {adjustingItem && <AdjustStockModal item={adjustingItem} onClose={() => setAdjustingItem(null)} />}
      {historyItem && (
        <MovementHistoryModal
          productId={historyItem.productId}
          productName={historyItem.productName}
          onClose={() => setHistoryItem(null)}
        />
      )}
      {showAddProductModal && (
        <ProductFormModal onClose={() => setShowAddProductModal(false)} />
      )}
    </div>
  );
}

export default InventoryPage;