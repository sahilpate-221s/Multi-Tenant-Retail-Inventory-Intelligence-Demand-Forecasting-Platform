import { useState } from "react";
import { Link } from "react-router-dom";
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
  useCreatePurchaseOrder,
} from "../hooks/usePurchaseOrders";
import { useProducts } from "../hooks/useProducts";
import { useSuppliers } from "../hooks/useSuppliers";
import type { PurchaseOrder, Supplier } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";

type TabFilter = "all" | "pending" | "received" | "cancelled";

function formatWhatsAppText(po: PurchaseOrder, storeName: string = "StockPilot Store"): string {
  const lines = [
    `*PURCHASE ORDER: PO-${po.id.slice(0, 8).toUpperCase()}*`,
    `Store: ${storeName}`,
    `Date: ${new Date(po.createdAt).toLocaleDateString()}`,
    `Expected Delivery: ${po.expectedArrivalDate}`,
    `--------------------------------`,
    `Product: ${po.productName}`,
    po.productSku ? `SKU: ${po.productSku}` : "",
    `Quantity: ${po.quantity} units`,
    `--------------------------------`,
    `Please confirm receipt and dispatch schedule. Thank you!`,
  ].filter(Boolean);

  return encodeURIComponent(lines.join("\n"));
}

function PurchaseOrdersPage() {
  const { data: purchaseOrders, isLoading, isError, refetch } = usePurchaseOrders();
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const filteredOrders = (purchaseOrders || []).filter((po) => {
    const matchesTab = activeTab === "all" || po.status === activeTab;
    const matchesSearch =
      searchTerm.trim() === "" ||
      po.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.productSku && po.productSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.supplierName && po.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      po.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = (purchaseOrders || []).filter((p) => p.status === "pending").length;
  const receivedCount = (purchaseOrders || []).filter((p) => p.status === "received").length;

  const handleReceive = async (poId: string) => {
    setReceivingId(poId);
    try {
      await receiveMutation.mutateAsync(poId);
    } finally {
      setReceivingId(null);
    }
  };

  const handleCancel = async (poId: string) => {
    if (confirm("Are you sure you want to cancel this purchase order?")) {
      await cancelMutation.mutateAsync(poId);
    }
  };

  const handlePrintSlip = (po: PurchaseOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order PO-${po.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 40px; color: #111; font-size: 13px; line-height: 1.6; }
            .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; }
            .meta { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f4f4f4; }
            .signature { margin-top: 60px; border-top: 1px dashed #777; width: 220px; padding-top: 8px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PURCHASE ORDER</div>
            <div>StockPilot Procurement Engine</div>
          </div>
          <div class="meta">
            <div><strong>PO Number:</strong> PO-${po.id.slice(0, 8).toUpperCase()}</div>
            <div><strong>Date Created:</strong> ${new Date(po.createdAt).toLocaleDateString()}</div>
            <div><strong>Supplier:</strong> ${po.supplierName || "Direct Distributor"}</div>
            <div><strong>Expected Delivery:</strong> ${po.expectedArrivalDate}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>SKU</th>
                <th>Quantity Ordered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${po.productName}</td>
                <td>${po.productSku || "—"}</td>
                <td><strong>${po.quantity} units</strong></td>
                <td>${po.status.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
          <div class="signature">Authorized Store Receiver Signature</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* ─── Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/8">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            SUPPLY CHAIN & PROCUREMENT
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Purchase Orders & Inbound Stock
          </h1>
          <p className="mt-1 text-xs text-[#97979d]">
            Manage distributor shipments, verify deliveries, and dispatch orders directly to suppliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/reorder-recommendations"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1a1a22] hover:bg-[#22222c] border border-white/10 text-[#e8e6e3] transition-all flex items-center gap-2"
          >
            <span>AI Reorders</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95"
          >
            + Create Purchase Order
          </button>
        </div>
      </div>

      {/* ─── KPI Summary Strip ─── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121216]/90 border border-white/8 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-[#71717a] font-semibold">Active Inbound Orders</p>
            <p className="text-2xl font-bold text-[#d4a853] mt-1 tabular-nums">{pendingCount}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#d4a853] animate-pulse" />
        </div>

        <div className="bg-[#121216]/90 border border-white/8 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-[#71717a] font-semibold">Deliveries Received</p>
            <p className="text-2xl font-bold text-[#4aba7a] mt-1 tabular-nums">{receivedCount}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#4aba7a]" />
        </div>

        <div className="bg-[#121216]/90 border border-white/8 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-[#71717a] font-semibold">Total Orders Logged</p>
            <p className="text-2xl font-bold text-[#e8e6e3] mt-1 tabular-nums">
              {(purchaseOrders || []).length}
            </p>
          </div>
          <span className="text-xs text-[#71717a]">Audit Trail</span>
        </div>
      </div>

      {/* ─── Filter Tabs & Search Bar ─── */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-[#121216] border border-white/8 rounded-lg self-start">
          {(["all", "pending", "received", "cancelled"] as TabFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-[#d4a853] text-[#0c0c0e] shadow-sm"
                  : "text-[#97979d] hover:text-[#e8e6e3] hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by product, SKU, supplier, or PO ID..."
          className="w-full sm:w-80 bg-[#121216] border border-white/8 focus:border-[#d4a853] rounded-lg px-3.5 py-2 text-xs text-[#e8e6e3] placeholder-[#5c5c64] outline-none transition-colors"
        />
      </div>

      {/* ─── Main Content ─── */}
      <div className="mt-5">
        {isLoading && <LoadingState message="Fetching procurement ledger..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && filteredOrders.length === 0 && (
          <EmptyState
            title="No purchase orders found"
            description={
              activeTab === "all"
                ? "Generate reorder recommendations or manually create a PO to begin tracking incoming shipments."
                : `No orders matching status '${activeTab}'.`
            }
          />
        )}

        {!isLoading && !isError && filteredOrders.length > 0 && (
          <div className="border border-white/8 rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#16161d] text-[#71717a] border-b border-white/8 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">PO Identifier</th>
                    <th className="px-5 py-3">Product / SKU</th>
                    <th className="px-5 py-3">Vendor / Supplier</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Expected Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Dispatch & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {filteredOrders.map((po) => {
                    const isPending = po.status === "pending";
                    const isReceived = po.status === "received";

                    const today = new Date().toISOString().split("T")[0];
                    const isDueTodayOrOverdue = isPending && po.expectedArrivalDate <= today;

                    return (
                      <tr key={po.id} className="hover:bg-white/2 transition-colors">
                        {/* PO ID */}
                        <td className="px-5 py-4 font-mono font-bold text-[#e8e6e3]">
                          PO-{po.id.slice(0, 8).toUpperCase()}
                          <span className="block text-[10px] text-[#71717a] font-normal">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <Link
                            to={`/products/${po.productId}`}
                            className="font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                          >
                            {po.productName}
                          </Link>
                          {po.productSku && (
                            <span className="block text-[10px] text-[#71717a]">
                              SKU: {po.productSku}
                            </span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="px-5 py-4">
                          {po.supplierName ? (
                            <div>
                              <span className="text-[#e8e6e3] font-medium">{po.supplierName}</span>
                              {po.supplierPhone && (
                                <span className="block text-[10px] text-[#71717a]">
                                  📞 {po.supplierPhone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#71717a] italic">Unassigned Vendor</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-4 font-bold text-[#f5cf7b] tabular-nums text-sm">
                          {po.quantity} units
                        </td>

                        {/* Expected Date */}
                        <td className="px-5 py-4">
                          <span
                            className={
                              isDueTodayOrOverdue
                                ? "text-[#d45a4a] font-bold"
                                : "text-[#e8e6e3]"
                            }
                          >
                            {po.expectedArrivalDate}
                          </span>
                          {isDueTodayOrOverdue && (
                            <span className="block text-[9px] uppercase tracking-wider text-[#d45a4a] font-bold">
                              DUE / ARRIVING
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isPending
                                ? "bg-[#d4a853]/15 text-[#d4a853] border-[#d4a853]/30"
                                : isReceived
                                ? "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                                : "bg-[#71717a]/15 text-[#71717a] border-[#71717a]/30"
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* WhatsApp Dispatch */}
                            <a
                              href={`https://wa.me/${
                                po.supplierPhone?.replace(/\D/g, "") || ""
                              }?text=${formatWhatsAppText(po)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all font-semibold flex items-center gap-1.5"
                              title="Share Purchase Order via WhatsApp"
                            >
                              <span>WhatsApp</span>
                            </a>

                            {/* Print Sheet */}
                            <button
                              onClick={() => handlePrintSlip(po)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#e8e6e3] border border-white/10 transition-all"
                              title="Print Purchase Slip"
                            >
                              🖨️
                            </button>

                            {/* Receive Button (1-Click) */}
                            {isPending && (
                              <button
                                onClick={() => handleReceive(po.id)}
                                disabled={receivingId === po.id}
                                className="px-3 py-1.5 rounded-lg bg-[#4aba7a] hover:bg-[#58cf8b] text-[#0c0c0e] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                              >
                                {receivingId === po.id ? "Restocking..." : "Receive"}
                              </button>
                            )}

                            {/* Cancel Button */}
                            {isPending && (
                              <button
                                onClick={() => handleCancel(po.id)}
                                disabled={cancelMutation.isPending}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#d45a4a]/20 text-[#71717a] hover:text-[#d45a4a] border border-white/10 transition-all"
                                title="Cancel Order"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Manual PO Creation Modal ─── */}
      {showCreateModal && <CreatePOModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

/** Modal to manually draft a new Purchase Order */
function CreatePOModal({ onClose }: { onClose: () => void }) {
  const { data: productsData } = useProducts({
    page: 1,
    pageSize: 200,
    sortBy: "name",
    sortOrder: "asc",
    isActive: "true",
  });
  const { data: suppliers } = useSuppliers();
  const createMutation = useCreatePurchaseOrder();

  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [errorMsg, setErrorMsg] = useState("");

  const productsList = productsData?.items || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setErrorMsg("Please select a product.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        productId,
        supplierId: supplierId || undefined,
        quantity,
        expectedArrivalDate,
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
          <h2 className="font-bold text-sm text-[#e8e6e3]">Draft New Purchase Order</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {/* Product Select */}
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              SELECT PRODUCT TO RESTOCK
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              required
            >
              <option value="">-- Choose Product --</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Select */}
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              SUPPLIER / DISTRIBUTOR (OPTIONAL)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            >
              <option value="">-- Select Supplier (or leave unassigned) --</option>
              {suppliers?.map((s: Supplier) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.contactPhone ? `(${s.contactPhone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              RESTOCK QUANTITY (UNITS)
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors tabular-nums"
              required
            />
          </div>

          {/* Expected Date */}
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              EXPECTED ARRIVAL DATE
            </label>
            <input
              type="date"
              value={expectedArrivalDate}
              onChange={(e) => setExpectedArrivalDate(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors tabular-nums"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating PO..." : "Issue Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PurchaseOrdersPage;
