import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useSales, useCreateSale, useCreateReturn } from "../hooks/useSales";
import { useStoreSettings } from "../hooks/useSettings";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import type { Sale, CreateSaleInput, Product } from "../lib/types";
import { ProductSearchCombobox } from "../components/sales/ProductSearchCombobox";
import { apiClient } from "../lib/apiClient";
import { useKhata } from "../hooks/useKhata";

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
  const [receiptSale, setReceiptSale] = useState<{
    id: string;
    totalAmount: number;
    items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
    paymentMethod: string;
    saleDate: string;
    tenderedAmount?: number;
    changeAmount?: number;
  } | null>(null);

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
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/pos"
            className="px-4 py-2.5 rounded-xl text-xs font-black text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(212,168,83,0.3)] flex items-center gap-1.5"
            title="Launch Dedicated High-Speed Billing Counter"
          >
            <span>⚡ Open Counter POS</span>
          </Link>

          <Link
            to="/khata"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#f5cf7b] bg-[#1a1812] hover:bg-[#252218] border border-[#d4a853]/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Manage Store Credit & Udhaar Accounts"
          >
            <span>📒</span>
            <span>Customer Khata</span>
          </Link>

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
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#e8e6e3] bg-[#1c1c24] hover:bg-[#252530] border border-white/15 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Quick Modal</span>
          </button>
        </div>
      </div>

      {/* ─── Top 4 KPI Metrics Row ─── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between hover:border-white/20 hover:scale-[1.01] transition-all duration-200 cursor-default">
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
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between hover:border-white/20 hover:scale-[1.01] transition-all duration-200 cursor-default">
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
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between hover:border-white/20 hover:scale-[1.01] transition-all duration-200 cursor-default">
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
        <div className="p-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl flex flex-col justify-between hover:border-white/20 hover:scale-[1.01] transition-all duration-200 cursor-default">
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
          onSaleSuccess={(receipt) => {
            setRecordModalOpen(false);
            setReceiptSale(receipt);
            refetch();
          }}
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

      {/* ─── MODAL 3: THERMAL BILL & RECEIPT ─── */}
      {receiptSale && (
        <SaleReceiptModal
          receipt={receiptSale}
          currency={currency}
          storeName={store?.name || "StockPilot Retail"}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}

interface ReceiptSale {
  id: string;
  totalAmount: number;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  paymentMethod: string;
  saleDate: string;
  tenderedAmount?: number;
  changeAmount?: number;
}

/** Modal to record a new sale order with fast barcode scanning and combobox search */
function RecordSaleModal({
  currency,
  onClose,
  onSaleSuccess,
}: {
  currency: string;
  onClose: () => void;
  onSaleSuccess: (receipt: ReceiptSale) => void;
}) {
  const createSaleMutation = useCreateSale();
  const { customers: khataCustomers, recordSale: recordKhataSale } = useKhata();
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tenderedAmount, setTenderedAmount] = useState<number | "">("");
  const [creditCustomerName, setCreditCustomerName] = useState("");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [items, setItems] = useState<
    { productId: string; productName?: string; productSku?: string; quantity: number; unitPrice: number }[]
  >([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [errorMsg, setErrorMsg] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Audio confirmation beep for USB scanner
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}
  };

  const handleQuickScan = async () => {
    const code = scanCode.trim();
    if (!code) return;
    setScanStatus("Scanning...");

    try {
      const res = await apiClient.get<{ items: Product[] }>(`/api/products?search=${encodeURIComponent(code)}&page=1&pageSize=1&sortBy=name&sortOrder=asc&isActive=true`);
      if (res.items && res.items.length > 0) {
        const found = res.items[0];
        playBeep();

        const existingIdx = items.findIndex((i) => i.productId === found.id);
        if (existingIdx >= 0) {
          const updated = [...items];
          updated[existingIdx].quantity += 1;
          setItems(updated);
        } else if (items.length === 1 && !items[0].productId) {
          setItems([{
            productId: found.id,
            productName: found.name,
            productSku: found.sku,
            quantity: 1,
            unitPrice: Number(found.sellingPrice),
          }]);
        } else {
          setItems([
            ...items,
            {
              productId: found.id,
              productName: found.name,
              productSku: found.sku,
              quantity: 1,
              unitPrice: Number(found.sellingPrice),
            },
          ]);
        }

        setScanStatus(`Added: ${found.name}`);
        setScanCode("");
        setTimeout(() => setScanStatus(null), 2500);
      } else {
        setScanStatus(`Product '${code}' not found.`);
        setTimeout(() => setScanStatus(null), 3000);
      }
    } catch {
      setScanStatus("Scan lookup failed.");
      setTimeout(() => setScanStatus(null), 3000);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuickScan();
    }
  };

  const handleProductSelect = (index: number, product: Product) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: Number(product.sellingPrice),
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
  const changeDue = typeof tenderedAmount === "number" && tenderedAmount >= grandTotal ? tenderedAmount - grandTotal : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    for (const item of items) {
      if (!item.productId) {
        setErrorMsg("Please select or scan a product for each line item.");
        return;
      }
      if (item.quantity <= 0) {
        setErrorMsg("Quantity must be at least 1.");
        return;
      }
    }

    if (paymentMethod === "credit" && !creditCustomerName.trim()) {
      setErrorMsg("Please enter a customer name for Udhaar / Store Credit.");
      return;
    }

    try {
      const payload: CreateSaleInput = {
        saleDate,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        notes: `Payment: ${paymentMethod.toUpperCase()}${tenderedAmount ? ` | Tendered: ${tenderedAmount}` : ""}${creditCustomerName ? ` | Udhaar: ${creditCustomerName} (${creditCustomerPhone || "No Phone"})` : ""}`,
      };

      const res = await createSaleMutation.mutateAsync(payload);

      if (paymentMethod === "credit" && creditCustomerName.trim()) {
        recordKhataSale(
          creditCustomerName.trim(),
          creditCustomerPhone.trim(),
          grandTotal,
          res.id,
          `POS Order ORD-${res.id.slice(0, 8).toUpperCase()}`
        );
      }

      onSaleSuccess({
        id: res.id,
        totalAmount: grandTotal,
        items: items.map((i) => ({
          productName: i.productName || "Product",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: Math.round(i.quantity * i.unitPrice * 100) / 100,
        })),
        paymentMethod: paymentMethod === "credit" ? `UDHAAR (${creditCustomerName})` : paymentMethod,
        saleDate,
        tenderedAmount: typeof tenderedAmount === "number" ? tenderedAmount : undefined,
        changeAmount: changeDue,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record sale.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div className="w-full max-w-2xl rounded-2xl bg-[#121218] border border-white/10 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#71717a] hover:text-[#f4f4f5] transition-colors p-1"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
          <h2 className="text-lg font-bold text-[#f4f4f5]">High-Speed Counter POS</h2>
        </div>
        <p className="text-xs text-[#97979d]">
          Scan barcodes or search across catalog. Stock decrements atomically on transaction.
        </p>

        {/* ─── USB Barcode Gun Fast Scanner ─── */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-[#d4a853]/15 to-transparent border border-[#d4a853]/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d4a853] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse" />
              ⚡ High-Speed Barcode / SKU Scanner
            </span>
            {scanStatus && (
              <span className="text-[10px] font-bold text-[#f5cf7b]">{scanStatus}</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              ref={scanInputRef}
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="Scan barcode with USB scanner or type SKU and press Enter..."
              className="flex-1 px-3.5 py-2 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
            />
            <button
              type="button"
              onClick={handleQuickScan}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e8be66] active:scale-95 transition-all shadow-sm"
            >
              + Add
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#d45a4a]/15 border border-[#d45a4a]/30 text-xs text-[#f87171]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Sale Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-[#71717a] font-semibold mb-1">
                Sale Date
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 focus:outline-none focus:border-[#d4a853]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#71717a] font-semibold mb-1">
                Payment Channel
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "cash", label: "💵 Cash" },
                  { id: "upi", label: "📱 UPI" },
                  { id: "card", label: "💳 Card" },
                  { id: "credit", label: "📒 Udhaar" },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`py-2 rounded-lg text-[11px] font-semibold border transition-all text-center ${
                      paymentMethod === pm.id
                        ? "bg-[#d4a853] text-[#0c0c0e] border-[#d4a853] shadow-sm"
                        : "bg-[#0b0b0f] text-[#97979d] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Khata Account Input (When Udhaar is selected) */}
          {paymentMethod === "credit" && (
            <div className="p-3.5 rounded-xl bg-[#d4a853]/10 border border-[#d4a853]/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#d4a853] flex items-center gap-1.5">
                  <span>📒</span> Customer Khata (Udhaar) Account
                </span>
                <span className="text-[10px] text-[#97979d]">Debt balance will be updated automatically</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#97979d] block mb-1">CUSTOMER NAME (REQUIRED)</label>
                  <input
                    type="text"
                    list="khata-customers-list"
                    value={creditCustomerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreditCustomerName(val);
                      const matched = khataCustomers.find((c) => c.name.toLowerCase() === val.toLowerCase());
                      if (matched && matched.phone) {
                        setCreditCustomerPhone(matched.phone);
                      }
                    }}
                    placeholder="e.g. Ramesh Sharma"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
                  />
                  <datalist id="khata-customers-list">
                    {khataCustomers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.phone ? `${c.phone} — Due: ${currency}${c.totalBalance.toFixed(0)}` : `Due: ${currency}${c.totalBalance.toFixed(0)}`}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] text-[#97979d] block mb-1">PHONE NUMBER (FOR WHATSAPP)</label>
                  <input
                    type="text"
                    value={creditCustomerPhone}
                    onChange={(e) => setCreditCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98201 12345"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#e8e6e3]">
              <span>Cart Line Items ({items.length})</span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-[11px] text-[#d4a853] hover:underline flex items-center gap-1"
              >
                + Add Item
              </button>
            </div>

            {items.map((row, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#0b0b0f] border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                {/* Product Search Combobox */}
                <div className="flex-1">
                  <ProductSearchCombobox
                    selectedProductId={row.productId}
                    selectedProductName={row.productName ? `${row.productName} (${row.productSku || ""})` : ""}
                    currency={currency}
                    onSelect={(p) => handleProductSelect(idx, p)}
                    placeholder="Search name, SKU, or barcode..."
                  />
                </div>

                {/* Quantity */}
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                    required
                    placeholder="Qty"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 font-bold tabular-nums focus:outline-none focus:border-[#d4a853]"
                  />
                </div>

                {/* Unit Price */}
                <div className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={row.unitPrice}
                    onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value))}
                    required
                    placeholder="Price"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 tabular-nums focus:outline-none focus:border-[#d4a853]"
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

          {/* Cash Tendered & Change Calculator (When Cash mode selected) */}
          {paymentMethod === "cash" && (
            <div className="p-3 rounded-xl bg-white/4 border border-white/6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#97979d]">Cash Tendered:</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-28 px-2.5 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 focus:border-[#d4a853] outline-none tabular-nums font-bold"
                />
              </div>

              {typeof tenderedAmount === "number" && (
                <div className="text-right text-xs">
                  <span className="text-[#97979d]">Change to Customer: </span>
                  <span className="font-bold text-[#4aba7a] tabular-nums text-sm">
                    {currency}{changeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Grand Total Footer Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#d4a853]/15 to-transparent border border-[#d4a853]/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#e8e6e3] block">Order Grand Total:</span>
              <span className="text-[10px] text-[#97979d] uppercase">Channel: {paymentMethod}</span>
            </div>
            <span className="text-xl font-bold text-[#f5cf7b] tabular-nums">
              {currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
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
              {createSaleMutation.isPending ? "Recording Sale..." : "Confirm & Complete Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal to display 80mm thermal printable bill and WhatsApp receipt */
function SaleReceiptModal({
  receipt,
  currency,
  storeName,
  onClose,
}: {
  receipt: ReceiptSale;
  currency: string;
  storeName: string;
  onClose: () => void;
}) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ORD-${receipt.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 280px; margin: 0 auto; color: #111; font-size: 12px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #555; margin: 8px 0; }
            .bold { font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .items { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .items th, .items td { text-align: left; padding: 3px 0; font-size: 11px; }
            .items td.right, .items th.right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 15px;">${storeName}</div>
          <div class="center" style="font-size: 10px;">Tax Invoice / Counter Sale</div>
          <div class="divider"></div>
          <div>Invoice: ORD-${receipt.id.slice(0, 8).toUpperCase()}</div>
          <div>Date: ${receipt.saleDate} ${new Date().toLocaleTimeString()}</div>
          <div>Payment: ${receipt.paymentMethod.toUpperCase()}</div>
          <div class="divider"></div>
          <table class="items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items
                .map(
                  (i) => `
                <tr>
                  <td>${i.productName}</td>
                  <td>${i.quantity} x ${currency}${i.unitPrice.toFixed(2)}</td>
                  <td class="right">${currency}${i.lineTotal.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 14px;">
            <span>GRAND TOTAL:</span>
            <span>${currency}${receipt.totalAmount.toFixed(2)}</span>
          </div>
          ${
            receipt.tenderedAmount
              ? `
            <div class="row">
              <span>Cash Tendered:</span>
              <span>${currency}${receipt.tenderedAmount.toFixed(2)}</span>
            </div>
            <div class="row bold">
              <span>Change Returned:</span>
              <span>${currency}${(receipt.changeAmount || 0).toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 10px;">
            Thank you for shopping with us!<br/>
            StockPilot Autonomous Retail Engine
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const whatsAppText = encodeURIComponent(
    [
      `*INVOICE: ${storeName}*`,
      `Order: ORD-${receipt.id.slice(0, 8).toUpperCase()}`,
      `Date: ${receipt.saleDate}`,
      `--------------------------------`,
      ...receipt.items.map(
        (i) => `${i.productName} (${i.quantity}x) = ${currency}${i.lineTotal.toFixed(2)}`
      ),
      `--------------------------------`,
      `*Total Paid: ${currency}${receipt.totalAmount.toFixed(2)} (${receipt.paymentMethod.toUpperCase()})*`,
      `Thank you for your visit!`,
    ].join("\n")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="w-full max-w-md rounded-2xl bg-[#121218] border border-white/10 shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4aba7a]" />
            <h3 className="font-bold text-sm text-[#f4f4f5]">Sale Successfully Recorded</h3>
          </div>
          <button onClick={onClose} className="text-[#71717a] hover:text-[#f4f4f5]">
            ✕
          </button>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[#0b0b0f] border border-white/5 space-y-2 text-xs">
          <div className="flex justify-between text-[#97979d]">
            <span>Invoice Ref:</span>
            <span className="text-[#e8e6e3] font-bold">
              ORD-{receipt.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-[#97979d]">
            <span>Payment Mode:</span>
            <span className="text-[#d4a853] font-bold uppercase">{receipt.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-[#97979d]">
            <span>Items Dispatched:</span>
            <span className="text-[#e8e6e3]">{receipt.items.length} line item(s)</span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-[#f5cf7b]">
            <span>Total Collected:</span>
            <span>
              {currency}
              {receipt.totalAmount.toFixed(2)}
            </span>
          </div>
          {receipt.changeAmount !== undefined && receipt.changeAmount > 0 && (
            <div className="flex justify-between text-xs font-bold text-[#4aba7a]">
              <span>Change to Customer:</span>
              <span>
                {currency}
                {receipt.changeAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-[#e8e6e3] font-semibold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>🖨️ Thermal Slip</span>
          </button>
          <a
            href={`https://wa.me/?text=${whatsAppText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] font-semibold text-xs border border-[#25D366]/40 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>📱 WhatsApp Bill</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-bold text-xs transition-all active:scale-95"
        >
          Done / Next Transaction →
        </button>
      </div>
    </div>
  );
}

/** Compact and modern modal to inspect order details and process returns */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#121218] border border-white/10 shadow-2xl p-5 md:p-6 relative max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
              <h2 className="text-base font-bold text-[#f4f4f5] tracking-tight">
                Order #{sale.id.slice(0, 8).toUpperCase()}
              </h2>
            </div>
            <span className="text-[11px] text-[#71717a] font-mono mt-0.5 block">
              {sale.saleDate}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#97979d] hover:text-[#f4f4f5] flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Order Summary Chips */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#0b0b0f] border border-white/5">
            <div>
              <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Total</span>
              <span className="text-sm font-bold text-[#f5cf7b] font-mono mt-0.5 block">
                {currency}{sale.totalAmount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Items</span>
              <span className="text-xs font-semibold text-[#f4f4f5] mt-0.5 block">
                {sale.totalUnits} pcs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Payment</span>
              <span className="text-[11px] font-mono text-emerald-400 mt-0.5 block truncate" title={sale.notes || "Standard"}>
                {sale.notes?.includes("Pay: ") ? sale.notes.split("Pay: ")[1]?.split(" ")[0] : "PAID"}
              </span>
            </div>
          </div>

          {/* Purchased Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#b4b4bc] uppercase tracking-wider">
                Items ({sale.items.length})
              </span>
              <span className="text-[10px] text-[#71717a]">Qty / Price</span>
            </div>

            <div className="space-y-2">
              {sale.items.map((item) => {
                const remaining = item.quantity - (item.returnedQuantity || 0);
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#161620] border border-white/5 flex items-center justify-between gap-3 text-xs hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[#f4f4f5] truncate" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-[#71717a] font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{item.productSku}</span>
                        <span>•</span>
                        <span>{currency}{item.unitPrice.toFixed(2)} ea</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div>
                        <div className="font-bold text-[#f5cf7b] font-mono">
                          {currency}{item.lineTotal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#97979d]">
                          Qty: <strong className="text-[#e8e6e3]">{item.quantity}</strong>
                          {item.returnedQuantity ? (
                            <span className="text-rose-400 ml-1">(-{item.returnedQuantity})</span>
                          ) : null}
                        </div>
                      </div>

                      {remaining > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReturnItem({
                              saleItemId: item.id,
                              productName: item.productName,
                              maxQty: remaining,
                            });
                            setReturnQty(1);
                            setReturnError("");
                          }}
                          className="px-2 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-medium transition-all active:scale-95 cursor-pointer"
                        >
                          Return
                        </button>
                      ) : (
                        <span className="text-[9px] text-[#71717a] px-1.5 py-0.5 rounded bg-white/5">
                          Returned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Sub-Form if active */}
          {returnItem && (
            <form onSubmit={handleProcessReturn} className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">
                  Return: {returnItem.productName}
                </span>
                <button
                  type="button"
                  onClick={() => setReturnItem(null)}
                  className="text-xs text-[#71717a] hover:text-[#f4f4f5] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {returnError && (
                <div className="p-2 rounded bg-rose-500/20 text-xs text-rose-200">
                  {returnError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-[#97979d] mb-1">
                    Qty (Max: {returnItem.maxQty})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={returnItem.maxQty}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#97979d] mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#0b0b0f] text-[#f4f4f5] border border-white/10 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={returnMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {returnMutation.isPending ? "Restoring..." : "Confirm Return"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#e8e6e3] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
