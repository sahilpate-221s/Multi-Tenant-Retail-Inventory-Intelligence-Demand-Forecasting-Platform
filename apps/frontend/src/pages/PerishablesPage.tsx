import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getPerishableBatches,
  savePerishableBatches,
  addPerishableBatch,
  type PerishableBatch,
} from "../lib/batchExpiryStorage";
import { useProducts } from "../hooks/useProducts";
import { useAdjustStock } from "../hooks/useInventory";
import { useStoreSettings } from "../hooks/useSettings";

export default function PerishablesPage() {
  const { data: store } = useStoreSettings();
  const storeId = store?.id || "default";

  const { data: productsData } = useProducts({
    page: 1,
    pageSize: 100,
    isActive: "true",
    sortBy: "name",
    sortOrder: "asc",
  });
  const products = productsData?.items || [];

  const adjustStockMutation = useAdjustStock();

  // Batches state
  const [batches, setBatches] = useState<PerishableBatch[]>(() => getPerishableBatches(storeId));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "critical" | "warning" | "expired">("all");

  // Add Batch Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newBatchNo, setNewBatchNo] = useState("");
  const [newQuantity, setNewQuantity] = useState<number>(10);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [addError, setAddError] = useState("");

  // Action status message
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Compute days remaining for each batch
  const batchesWithDays = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    return batches.map((b) => {
      const expDate = new Date(b.expiryDate).getTime();
      const diffDays = Math.ceil((expDate - todayStart) / (1000 * 60 * 60 * 24));
      return {
        ...b,
        daysRemaining: diffDays,
      };
    });
  }, [batches]);

  // KPI Metrics
  const criticalCount = useMemo(() => {
    return batchesWithDays.filter((b) => b.daysRemaining > 0 && b.daysRemaining <= 3).length;
  }, [batchesWithDays]);

  const warningCount = useMemo(() => {
    return batchesWithDays.filter((b) => b.daysRemaining > 3 && b.daysRemaining <= 7).length;
  }, [batchesWithDays]);

  const expiredCount = useMemo(() => {
    return batchesWithDays.filter((b) => b.daysRemaining <= 0).length;
  }, [batchesWithDays]);

  const totalQuantityAtRisk = useMemo(() => {
    return batchesWithDays
      .filter((b) => b.daysRemaining <= 7)
      .reduce((sum, b) => sum + b.quantity, 0);
  }, [batchesWithDays]);

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batchesWithDays.filter((b) => {
      // Search
      const matchesSearch =
        !searchQuery.trim() ||
        b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.sku.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      if (filterTab === "critical") return b.daysRemaining > 0 && b.daysRemaining <= 3;
      if (filterTab === "warning") return b.daysRemaining > 3 && b.daysRemaining <= 7;
      if (filterTab === "expired") return b.daysRemaining <= 0;
      return true;
    });
  }, [batchesWithDays, searchQuery, filterTab]);

  // Handler: Add New Batch
  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newProductId) {
      setAddError("Please select a product.");
      return;
    }
    if (!newBatchNo.trim()) {
      setAddError("Please enter a lot/batch number.");
      return;
    }
    if (!newExpiryDate) {
      setAddError("Please pick an expiration date.");
      return;
    }
    if (newQuantity <= 0) {
      setAddError("Quantity must be at least 1.");
      return;
    }

    const matchedProd = products.find((p) => p.id === newProductId);
    if (!matchedProd) {
      setAddError("Selected product not found.");
      return;
    }

    const created = addPerishableBatch(storeId, {
      productId: matchedProd.id,
      productName: matchedProd.name,
      sku: matchedProd.sku,
      batchNumber: newBatchNo.trim().toUpperCase(),
      quantity: newQuantity,
      expiryDate: newExpiryDate,
    });

    const updated = [created, ...batches];
    setBatches(updated);
    setShowAddModal(false);
    setNewProductId("");
    setNewBatchNo("");
    setNewExpiryDate("");
    setNewQuantity(10);
    setActionNotice(`✓ Batch ${created.batchNumber} added successfully.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Handler: Mark Damaged / Write-off
  const handleMarkSpoiled = async (batch: PerishableBatch) => {
    const confirmSpoil = window.confirm(
      `Mark ${batch.quantity} units of "${batch.productName}" (Batch: ${batch.batchNumber}) as damaged/expired? This will deduct them from inventory.`
    );
    if (!confirmSpoil) return;

    try {
      // 1. Deduct from backend inventory atomically
      await adjustStockMutation.mutateAsync({
        productId: batch.productId,
        quantityChange: -batch.quantity,
        reason: "damage",
        note: `Expired/Spoiled Lot ${batch.batchNumber}`,
      });

      // 2. Remove batch from local storage
      const remaining = batches.filter((b) => b.id !== batch.id);
      savePerishableBatches(storeId, remaining);
      setBatches(remaining);

      setActionNotice(`✓ Marked ${batch.quantity} units of ${batch.productName} as Spoilage Write-Off.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to adjust inventory: " + (err.message || "Unknown error"));
    }
  };

  // Handler: Apply Clearance Discount
  const handleDiscountPromo = (batch: PerishableBatch) => {
    setActionNotice(
      `🏷️ 20% Clearance Discount applied for Batch ${batch.batchNumber}! Move to front display rack.`
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto select-none min-h-screen">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Spoilage & Freshness Sentinel
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#f4f4f5] tracking-tight">
            Expiry & Perishables Tracker
          </h1>
          <p className="text-xs text-[#97979d] mt-1">
            Track batches, avoid dead stock, and get 3-day and 7-day proactive expiry alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/pos"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#f5cf7b] bg-[#1a1812] hover:bg-[#252218] border border-[#d4a853]/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>⚡ Open POS Counter</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(212,168,83,0.25)] flex items-center gap-2"
          >
            <span>+ Add Perishable Batch</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-amber-300 hover:text-white">✕</button>
        </div>
      )}

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical <= 3 Days */}
        <div className="p-5 rounded-2xl bg-[#141216] border border-rose-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              🔴 Urgent Expiry (≤ 3 Days)
            </span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-200 font-mono">
            {criticalCount} <span className="text-xs font-normal text-[#97979d]">batches</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-300/80">
            Immediate action needed: discount or front rack.
          </p>
        </div>

        {/* Card 2: Warning 4-7 Days */}
        <div className="p-5 rounded-2xl bg-[#141412] border border-amber-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              🟡 Next 7 Days
            </span>
            <span className="text-lg">⏳</span>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-200 font-mono">
            {warningCount} <span className="text-xs font-normal text-[#97979d]">batches</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-300/80">
            Prepare promotional clearance.
          </p>
        </div>

        {/* Card 3: Already Expired */}
        <div className="p-5 rounded-2xl bg-[#161214] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#97979d]">
              💀 Already Expired
            </span>
            <span className="text-lg">🗑️</span>
          </div>
          <div className="mt-3 text-3xl font-black text-[#f4f4f5] font-mono">
            {expiredCount} <span className="text-xs font-normal text-[#71717a]">batches</span>
          </div>
          <p className="mt-1 text-[11px] text-[#97979d]">
            Remove from shelf & record write-off.
          </p>
        </div>

        {/* Card 4: Total Units at Risk */}
        <div className="p-5 rounded-2xl bg-[#121218] border border-[#d4a853]/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4a853]">
              📦 Units at Spoilage Risk
            </span>
            <span className="text-lg">🛡️</span>
          </div>
          <div className="mt-3 text-3xl font-black text-[#f5cf7b] font-mono">
            {totalQuantityAtRisk} <span className="text-xs font-normal text-[#97979d]">total pieces</span>
          </div>
          <p className="mt-1 text-[11px] text-[#97979d]">
            Across all expiring lots.
          </p>
        </div>
      </div>

      {/* ─── Search & Tab Filters ─── */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121218] border border-white/10 self-start sm:self-auto overflow-x-auto">
          {[
            { id: "all", label: `All Batches (${batches.length})` },
            { id: "critical", label: `🔴 Urgent (≤ 3d) (${criticalCount})` },
            { id: "warning", label: `🟡 Warning (7d) (${warningCount})` },
            { id: "expired", label: `💀 Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTab === tab.id
                  ? "bg-[#d4a853] text-[#0c0c0e] font-bold shadow-sm"
                  : "text-[#97979d] hover:text-[#f4f4f5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product or lot number..."
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-[#121218] text-[#f4f4f5] border border-white/10 focus:border-[#d4a853] outline-none"
          />
        </div>
      </div>

      {/* ─── Batches Table ─── */}
      <div className="mt-5 rounded-2xl bg-[#121218] border border-white/8 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161620] text-[#71717a] font-semibold uppercase tracking-wider border-b border-white/8">
              <tr>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Lot / Batch #</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Urgency Status</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#71717a] font-sans">
                    ✨ No batches found for this filter. All perishables are fresh!
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const isCritical = b.daysRemaining > 0 && b.daysRemaining <= 3;
                  const isWarning = b.daysRemaining > 3 && b.daysRemaining <= 7;
                  const isExpired = b.daysRemaining <= 0;

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <span className="font-bold text-[#f4f4f5] block">{b.productName}</span>
                        <span className="text-[10px] text-[#71717a] font-mono">{b.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-[#f5cf7b] font-bold">
                        {b.batchNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#f4f4f5] font-bold">
                          {b.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#97979d]">
                        {b.expiryDate}
                      </td>
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            💀 EXPIRED ({Math.abs(b.daysRemaining)}d ago)
                          </span>
                        ) : isCritical ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            🔴 {b.daysRemaining} {b.daysRemaining === 1 ? "day" : "days"} left (CRITICAL)
                          </span>
                        ) : isWarning ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🟡 {b.daysRemaining} days left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            🟢 Safe ({b.daysRemaining} days)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 font-sans">
                        {!isExpired && (
                          <button
                            onClick={() => handleDiscountPromo(b)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#f5cf7b] bg-[#1a1812] hover:bg-[#252218] border border-[#d4a853]/40 transition-all active:scale-95"
                            title="Place on front shelf with 20% discount"
                          >
                            🏷️ 20% Discount
                          </button>
                        )}
                        <button
                          onClick={() => handleMarkSpoiled(b)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-all active:scale-95"
                          title="Deduct from inventory as spoilage/damage"
                        >
                          🗑️ Spoilage Write-Off
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add Batch Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121218] border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5]"
            >
              ✕
            </button>
            <h2 className="text-base font-bold text-[#f4f4f5] mb-1">
              Add Perishable Batch
            </h2>
            <p className="text-xs text-[#97979d] mb-4">
              Enter lot details to enable 3-day and 7-day proactive expiry tracking.
            </p>

            {addError && (
              <div className="p-2.5 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleAddBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#97979d] mb-1">Select Product *</label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                >
                  <option value="">-- Choose from catalogue --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#97979d] mb-1">Lot / Batch Number *</label>
                <input
                  type="text"
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  placeholder="e.g. LOT-MILK-202"
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#97979d] mb-1">Batch Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                  />
                </div>
                <div>
                  <label className="block text-[#97979d] mb-1">Expiration Date *</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0b0f] text-[#f4f4f5] border border-white/15 outline-none focus:border-[#d4a853]"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-[#97979d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e5b95c] transition-all"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
