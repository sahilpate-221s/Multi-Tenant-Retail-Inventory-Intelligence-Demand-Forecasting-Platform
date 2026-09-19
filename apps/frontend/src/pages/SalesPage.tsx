import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSales, useCreateSale, useCreateReturn } from "../hooks/useSales";
import { useProducts } from "../hooks/useProducts";
import { useStoreSettings } from "../hooks/useSettings";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import type { Sale, CreateSaleInput } from "../lib/types";

export default function SalesPage() {
  const { data: store } = useStoreSettings();
  const currency = store?.currency === "USD" ? "$" : store?.currency === "EUR" ? "€" : store?.currency === "GBP" ? "£" : "₹";

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d" | "90d" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Query parameters calculated based on preset
  const queryParams = useMemo(() => {
    const params: { page: number; limit: number; search?: string; startDate?: string; endDate?: string } = {
      page,
      limit,
    };
    if (search.trim()) params.search = search.trim();

    const today = new Date();
    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

    if (datePreset === "today") {
      params.startDate = toIsoDate(today);
      params.endDate = toIsoDate(today);
    } else if (datePreset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      params.startDate = toIsoDate(past);
      params.endDate = toIsoDate(today);
    } else if (datePreset === "30d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      params.startDate = toIsoDate(past);
      params.endDate = toIsoDate(today);
    } else if (datePreset === "90d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 90);
      params.startDate = toIsoDate(past);
      params.endDate = toIsoDate(today);
    } else if (datePreset === "custom") {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }

    return params;
  }, [page, limit, search, datePreset, startDate, endDate]);

  const { data, isLoading, isError, error, refetch } = useSales(queryParams);

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [detailModalSale, setDetailModalSale] = useState<Sale | null>(null);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto select-none">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a853]">
              Store Order Ledger
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#f4f4f5] tracking-tight">
            Sales & Transactions
          </h1>
          <p className="text-xs text-[#97979d] mt-1">
            Browse recorded customer orders, track sales turnover, and record manual counter transactions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/import"
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#e8e6e3] bg-[#14141a] hover:bg-[#1c1c24] border border-white/10 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4 text-[#d4a853]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Sales CSV</span>
          </Link>

          <button
            onClick={() => setRecordModalOpen(true)}
            id="record-sale-btn"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all shadow-[0_0_20px_rgba(212,168,83,0.25)] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* ─── Top 4 KPI Metrics Row ─── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
              Total Sales Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#d4a853]/15 border border-[#d4a853]/30 flex items-center justify-center text-[#d4a853]">
              <span className="font-bold text-xs">{currency}</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#f4f4f5] tabular-nums">
              {currency}
              {(data?.metrics?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#4aba7a] mt-1 block">
              In selected time window
            </span>
          </div>
        </div>

        {/* Metric 2: Total Units Sold */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
              Units Sold
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4aba7a]/15 border border-[#4aba7a]/30 flex items-center justify-center text-[#4aba7a]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#f4f4f5] tabular-nums">
              {(data?.metrics?.totalUnits ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-[#71717a] mt-1 block">
              Physical inventory items dispatched
            </span>
          </div>
        </div>

        {/* Metric 3: Total Orders */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
              Orders Recorded
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#f4f4f5] tabular-nums">
              {(data?.metrics?.totalOrders ?? 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-[#71717a] mt-1 block">
              Distinct checkout invoices
            </span>
          </div>
        </div>

        {/* Metric 4: Average Order Value */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
              Average Order Value (AOV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#d4a853]/15 border border-[#d4a853]/30 flex items-center justify-center text-[#d4a853]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#f5cf7b] tabular-nums">
              {currency}
              {(data?.metrics?.avgOrderValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#71717a] mt-1 block">
              Mean transaction size
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search & Date Presets Filter Bar ─── */}
      <div className="mt-8 p-4 rounded-2xl bg-[#121218] border border-white/8 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name, SKU, or order ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
          />
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Time" },
            { id: "90d", label: "90 Days" },
            { id: "30d", label: "30 Days" },
            { id: "7d", label: "7 Days" },
            { id: "today", label: "Today" },
            { id: "custom", label: "Custom" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setDatePreset(preset.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === preset.id
                  ? "bg-[#d4a853] text-[#0c0c0e] font-bold shadow-sm"
                  : "bg-white/[0.04] text-[#97979d] hover:text-[#e8e6e3] hover:bg-white/[0.08]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Selector (if selected) */}
      {datePreset === "custom" && (
        <div className="mt-3 p-4 rounded-xl bg-[#121218] border border-white/5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#97979d]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#97979d]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
            />
          </div>
        </div>
      )}

      {/* ─── Sales Ledger Table ─── */}
      <div className="mt-6 rounded-2xl bg-[#121218] border border-white/8 shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-16">
            <LoadingState message="Loading sales records..." />
          </div>
        ) : isError ? (
          <div className="p-16">
            <ErrorState
              title="Failed to load sales"
              description={error instanceof Error ? error.message : "Unable to load sales records."}
              onRetry={() => refetch()}
            />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-16">
            <EmptyState
              title="No sales transactions found"
              description={
                search || datePreset !== "all"
                  ? "No sales match your current search or date filters. Try adjusting your search query."
                  : "You haven't recorded any sales yet. Record a sale manually or upload a sales CSV to begin tracking."
              }
              action={
                <button
                  onClick={() => setRecordModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-105 transition-all shadow-md"
                >
                  Record Your First Sale
                </button>
              }
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.02] text-[#71717a] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-6">Transaction ID</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Items Sold</th>
                    <th className="py-3.5 px-6 text-center">Total Units</th>
                    <th className="py-3.5 px-6 text-right">Order Amount</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.items.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Transaction ID */}
                      <td className="py-4 px-6 font-mono text-xs text-[#e8e6e3]">
                        <span className="px-2 py-1 rounded bg-[#0b0b0f] border border-white/10 font-medium">
                          #{sale.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-[#97979d]">
                        {new Date(sale.saleDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Line Items Summary */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          {sale.items.slice(0, 2).map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/8 text-[11px] text-[#e8e6e3]"
                            >
                              <span className="font-medium truncate max-w-[140px]">{item.productName}</span>
                              <span className="text-[#d4a853] font-bold">×{item.quantity}</span>
                            </span>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="text-[10px] text-[#71717a] font-mono">
                              +{sale.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Units */}
                      <td className="py-4 px-6 text-center font-bold text-[#f4f4f5] tabular-nums">
                        {sale.totalUnits}
                      </td>

                      {/* Order Amount */}
                      <td className="py-4 px-6 text-right font-bold text-[#f5cf7b] tabular-nums text-sm">
                        {currency}
                        {sale.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        {sale.returnStatus === "full" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d45a4a]/20 text-[#f87171] border border-[#d45a4a]/30">
                            Fully Returned
                          </span>
                        ) : sale.returnStatus === "partial" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d4a853]/20 text-[#f5cf7b] border border-[#d4a853]/30">
                            Partial Return
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4aba7a]/20 text-[#4aba7a] border border-[#4aba7a]/30">
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setDetailModalSale(sale)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#e8e6e3] hover:text-[#d4a853] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data && data.pagination.totalPages > 1 && (
              <div className="p-4 border-t border-white/8 flex items-center justify-between text-xs text-[#97979d]">
                <span>
                  Showing page <strong className="text-[#f4f4f5]">{data.pagination.page}</strong> of{" "}
                  <strong className="text-[#f4f4f5]">{data.pagination.totalPages}</strong> (
                  {data.pagination.total} total sales)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg bg-[#0b0b0f] border border-white/10 disabled:opacity-40 hover:bg-white/[0.04] transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="px-3 py-1.5 rounded-lg bg-[#0b0b0f] border border-white/10 disabled:opacity-40 hover:bg-white/[0.04] transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: RECORD NEW SALE ─── */}
      {recordModalOpen && (
        <RecordSaleModal
          currency={currency}
          onClose={() => setRecordModalOpen(false)}
        />
      )}

      {/* ─── MODAL 2: TRANSACTION DETAILS & RETURNS ─── */}
      {detailModalSale && (
        <SaleDetailModal
          sale={detailModalSale}
          currency={currency}
          onClose={() => setDetailModalSale(null)}
          onReturnProcessed={() => {
            setDetailModalSale(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/** Modal to record a new sale order */
function RecordSaleModal({
  currency,
  onClose,
}: {
  currency: string;
  onClose: () => void;
}) {
  const { data: productsData } = useProducts({
    page: 1,
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
    isActive: "true",
  });

  const createSaleMutation = useCreateSale();
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<
    { productId: string; quantity: number; unitPrice: number; currentStock?: number }[]
  >([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [errorMsg, setErrorMsg] = useState("");

  const productsList = productsData?.items || [];

  const handleProductChange = (index: number, productId: string) => {
    const product = productsList.find((p) => p.id === productId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId,
      unitPrice: product ? Number(product.sellingPrice) : 0,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(1, quantity),
    };
    setItems(updated);
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unitPrice: Math.max(0, unitPrice),
    };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const grandTotal = items.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate
    for (const item of items) {
      if (!item.productId) {
        setErrorMsg("Please select a product for each line item.");
        return;
      }
      if (item.quantity <= 0) {
        setErrorMsg("Quantity must be at least 1.");
        return;
      }
    }

    try {
      const payload: CreateSaleInput = {
        saleDate,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      await createSaleMutation.mutateAsync(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record sale.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#121218] border border-white/10 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#71717a] hover:text-[#f4f4f5] transition-colors p-1"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
          <h2 className="text-lg font-bold text-[#f4f4f5]">Record Counter Sale</h2>
        </div>
        <p className="text-xs text-[#97979d]">
          Create a sale order. Associated product inventory will be automatically deducted.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#d45a4a]/15 border border-[#d45a4a]/30 text-xs text-[#f87171]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Sale Date */}
          <div>
            <label className="block text-xs font-semibold text-[#e8e6e3] mb-1.5">
              Sale Date
            </label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#e8e6e3]">
              <span>Order Line Items</span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-[11px] text-[#d4a853] hover:underline flex items-center gap-1"
              >
                + Add Another Product
              </button>
            </div>

            {items.map((row, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#0b0b0f] border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                {/* Product Select */}
                <div className="flex-1">
                  <select
                    value={row.productId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
                  >
                    <option value="">Select a Product...</option>
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {currency}
                        {p.sellingPrice}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="w-24">
                  <label className="block text-[10px] text-[#71717a] mb-0.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 font-bold tabular-nums focus:outline-none focus:border-[#d4a853]"
                  />
                </div>

                {/* Unit Price */}
                <div className="w-28">
                  <label className="block text-[10px] text-[#71717a] mb-0.5">Unit Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={row.unitPrice}
                    onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 tabular-nums focus:outline-none focus:border-[#d4a853]"
                  />
                </div>

                {/* Line Total */}
                <div className="w-24 text-right">
                  <div className="text-[10px] text-[#71717a]">Line Total</div>
                  <div className="text-xs font-bold text-[#f5cf7b] tabular-nums mt-0.5">
                    {currency}
                    {(row.quantity * row.unitPrice).toFixed(2)}
                  </div>
                </div>

                {/* Remove Row */}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="text-[#71717a] hover:text-[#f87171] p-1.5 transition-colors self-end sm:self-center"
                    title="Remove Item"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Grand Total Footer Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#d4a853]/10 to-transparent border border-[#d4a853]/25 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e8e6e3]">Order Grand Total:</span>
            <span className="text-lg font-bold text-[#f5cf7b] tabular-nums">
              {currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#97979d] hover:text-[#f4f4f5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSaleMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
            >
              {createSaleMutation.isPending ? "Recording Sale..." : "Confirm & Deduct Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal to inspect order details and process returns */
function SaleDetailModal({
  sale,
  currency,
  onClose,
  onReturnProcessed,
}: {
  sale: Sale;
  currency: string;
  onClose: () => void;
  onReturnProcessed: () => void;
}) {
  const returnMutation = useCreateReturn();
  const [returnItem, setReturnItem] = useState<{ saleItemId: string; productName: string; maxQty: number } | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState("Customer returned product");
  const [returnError, setReturnError] = useState("");

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItem) return;
    setReturnError("");

    try {
      await returnMutation.mutateAsync({
        saleItemId: returnItem.saleItemId,
        quantity: returnQty,
        reason: returnReason,
      });
      onReturnProcessed();
    } catch (err: any) {
      setReturnError(err.message || "Failed to process return.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#121218] border border-white/10 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#71717a] hover:text-[#f4f4f5] transition-colors p-1"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <h2 className="text-lg font-bold text-[#f4f4f5]">
            Order #{sale.id.slice(0, 8)}
          </h2>
        </div>
        <p className="text-xs text-[#71717a] font-mono">
          Full ID: {sale.id}
        </p>

        {/* Order Meta Header */}
        <div className="mt-5 grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#0b0b0f] border border-white/5 text-xs">
          <div>
            <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Date</span>
            <span className="text-[#f4f4f5] font-medium mt-0.5 block">{sale.saleDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Total Amount</span>
            <span className="text-[#f5cf7b] font-bold mt-0.5 block">
              {currency}
              {sale.totalAmount.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Total Units</span>
            <span className="text-[#f4f4f5] font-medium mt-0.5 block">{sale.totalUnits} items</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-[#e8e6e3] uppercase tracking-wider mb-3">
            Purchased Line Items
          </h3>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[#71717a] font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4 text-center">Qty Sold</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Return Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sale.items.map((item) => {
                  const remaining = item.quantity - (item.returnedQuantity || 0);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#f4f4f5]">{item.productName}</div>
                        <div className="text-[10px] text-[#71717a] font-mono">{item.productSku}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        {item.quantity}
                        {item.returnedQuantity ? (
                          <span className="text-[10px] text-[#f87171] block">
                            (-{item.returnedQuantity} returned)
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right text-[#97979d]">
                        {currency}
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#f5cf7b]">
                        {currency}
                        {item.lineTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {remaining > 0 ? (
                          <button
                            onClick={() => {
                              setReturnItem({
                                saleItemId: item.id,
                                productName: item.productName,
                                maxQty: remaining,
                              });
                              setReturnQty(1);
                              setReturnError("");
                            }}
                            className="px-2.5 py-1 rounded bg-[#d45a4a]/15 hover:bg-[#d45a4a]/25 text-[#f87171] border border-[#d45a4a]/30 text-[10px] font-medium transition-colors"
                          >
                            Return Item
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#71717a] italic">Returned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Return Sub-Form if active */}
        {returnItem && (
          <form onSubmit={handleProcessReturn} className="mt-6 p-4 rounded-xl bg-[#d45a4a]/10 border border-[#d45a4a]/25 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#f87171]">
                Process Return for: {returnItem.productName}
              </span>
              <button
                type="button"
                onClick={() => setReturnItem(null)}
                className="text-xs text-[#71717a] hover:text-[#f4f4f5]"
              >
                Cancel
              </button>
            </div>

            {returnError && (
              <div className="p-2.5 rounded bg-[#d45a4a]/20 text-xs text-[#f87171]">
                {returnError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#97979d] mb-1">
                  Return Quantity (Max: {returnItem.maxQty})
                </label>
                <input
                  type="number"
                  min={1}
                  max={returnItem.maxQty}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#97979d] mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Customer return, defective"
                  required
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={returnMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#d45a4a] hover:bg-[#b8483a] transition-colors disabled:opacity-50"
              >
                {returnMutation.isPending ? "Restoring Stock..." : "Confirm Return & Restock"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-medium text-[#e8e6e3] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
