import { useState } from "react";
import { Link } from "react-router-dom";
import { useDeadStockScores, useGenerateDeadStockScores } from "../hooks/useDeadStock";
import { useAdjustStock } from "../hooks/useInventory";
import { useProduct, useUpdateProduct } from "../hooks/useProducts";
import { formatReasonCode } from "../lib/reasonCodes";
import type { DeadStockScore } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import ExplainButton from "../components/ai/ExplainButton";

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#d45a4a]";
  if (score >= 50) return "text-[#d4a853]";
  return "text-[#97979d]";
}

function DeadStockPage() {
  const { data: scores, isLoading, isError, refetch } = useDeadStockScores();
  const generate = useGenerateDeadStockScores();

  const [clearanceScore, setClearanceScore] = useState<DeadStockScore | null>(null);
  const [writeDownScore, setWriteDownScore] = useState<DeadStockScore | null>(null);

  const totalCapitalTiedUp = scores?.reduce((sum, s) => sum + Number(s.inventoryValue), 0) ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
            CAPITAL RECOVERY & VELOCITY
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Dead Stock & Stagnant SKU Audit
          </h1>
          <p className="mt-1 text-xs text-[#97979d]">
            Identifies immobilized working capital. Launch clearance markdowns or record write-offs to unlock cash flow.
          </p>
        </div>

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-xs font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95 disabled:opacity-50"
        >
          {generate.isPending ? "Auditing Ledger..." : "Analyze Dead Stock"}
        </button>
      </div>

      {scores && scores.length > 0 && (
        <div className="mt-6 bg-[#d45a4a]/10 border border-[#d45a4a]/30 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#d45a4a]">
              TOTAL WORKING CAPITAL IMMOBILIZED IN DEAD INVENTORY
            </p>
            <p className="text-2xl md:text-3xl font-bold text-[#e8e6e3] mt-1 tabular-nums">
              {formatCurrency(totalCapitalTiedUp)}
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded bg-[#d45a4a]/20 text-[#d45a4a] border border-[#d45a4a]/40 font-bold uppercase">
            ACTION REQUIRED
          </span>
        </div>
      )}

      <div className="mt-6">
        {isLoading && <LoadingState message="Auditing stagnation metrics across all bays..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {scores?.length === 0 && (
          <EmptyState
            title="Zero dead stock detected"
            description="All active SKUs have demonstrated healthy turnover within expected velocity cycles."
          />
        )}
        {scores && scores.length > 0 && (
          <div className="flex flex-col gap-3">
            {scores.map((s) => (
              <div
                key={s.id}
                className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(212,168,83,0.3)] transition-all shadow-md group"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <Link
                      to={`/products/${s.productId}`}
                      className="text-sm font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors"
                    >
                      {s.productName}
                    </Link>
                    <p className="text-xs text-[#97979d] mt-1">
                      On Hand: <strong className="text-[#e8e6e3]">{s.currentStock} units</strong> ·{" "}
                      {s.daysSinceLastSale !== null
                        ? `Last movement ${s.daysSinceLastSale} days ago`
                        : "Never sold"}
                    </p>
                    <p className="text-xs text-[#97979d] mt-0.5">
                      Trapped Capital:{" "}
                      <span className="font-semibold text-[#d4a853]">
                        {formatCurrency(Number(s.inventoryValue))}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-2xl font-bold tabular-nums ${scoreColor(s.score)}`}>
                        {s.score}
                      </p>
                      <p className="text-[10px] uppercase text-[#5c5c64]">Stagnation Index</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setClearanceScore(s)}
                        className="px-3 py-1.5 rounded-lg bg-[#d4a853]/15 hover:bg-[#d4a853]/25 text-[#d4a853] border border-[#d4a853]/30 text-xs font-semibold transition-all active:scale-95"
                        title="Lower selling price to liquidate stock"
                      >
                        🏷️ Discount
                      </button>

                      <button
                        onClick={() => setWriteDownScore(s)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#d45a4a]/15 text-[#97979d] hover:text-[#d45a4a] border border-white/10 text-xs transition-all active:scale-95"
                        title="Record damaged or discarded stock write-off"
                      >
                        🗑️ Write-Down
                      </button>
                    </div>
                  </div>
                </div>

                <ul className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] text-xs text-[#5c5c64] space-y-1">
                  {s.reasonCodes.map((code, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[#d45a4a]">•</span>
                      <span>{formatReasonCode(code)}</span>
                    </li>
                  ))}
                </ul>
                <ExplainButton type="dead-stock" id={s.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clearance Discount Modal */}
      {clearanceScore && (
        <ClearanceDiscountModal
          score={clearanceScore}
          onClose={() => setClearanceScore(null)}
          onSuccess={() => {
            setClearanceScore(null);
            refetch();
          }}
        />
      )}

      {/* Write-Down Modal */}
      {writeDownScore && (
        <WriteDownModal
          score={writeDownScore}
          onClose={() => setWriteDownScore(null)}
          onSuccess={() => {
            setWriteDownScore(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/** Modal to apply a promotional clearance discount on stagnant stock */
function ClearanceDiscountModal({
  score,
  onClose,
  onSuccess,
}: {
  score: DeadStockScore;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: product } = useProduct(score.productId);
  const updateProductMutation = useUpdateProduct();

  const [discountPercent, setDiscountPercent] = useState(20);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const originalPrice = product ? Number(product.sellingPrice) : 0;
  const targetPrice =
    customPrice !== null
      ? customPrice
      : Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setErrorMsg("");

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        name: product.name,
        sku: product.sku,
        costPrice: Number(product.costPrice),
        sellingPrice: targetPrice,
        barcode: product.barcode || undefined,
        categoryId: product.categoryId || undefined,
        isActive: product.isActive,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update price.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4 font-mono">
      <div className="bg-[#141418] border border-white/12 rounded-xl w-full max-w-md p-6 shadow-2xl text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-white/6">
          <h2 className="font-bold text-sm text-[#e8e6e3]">🏷️ Clearance Markdown</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <div className="mt-3 p-3 bg-white/4 rounded-lg">
          <p className="font-semibold text-[#e8e6e3] text-sm">{score.productName}</p>
          <div className="mt-1 flex items-center justify-between text-[#97979d]">
            <span>Current Selling Price:</span>
            <strong className="text-[#e8e6e3]">₹{originalPrice}</strong>
          </div>
          <div className="flex items-center justify-between text-[#97979d] mt-0.5">
            <span>Current Cost Price:</span>
            <span>₹{product?.costPrice ?? "—"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              SELECT LIQUIDATION DISCOUNT
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => {
                    setDiscountPercent(pct);
                    setCustomPrice(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    discountPercent === pct && customPrice === null
                      ? "bg-[#d4a853] text-[#0c0c0e] border-[#d4a853]"
                      : "bg-[#0a0a0c] text-[#e8e6e3] border-white/10 hover:border-white/30"
                  }`}
                >
                  {pct}% OFF
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              OR ENTER EXACT MARKDOWN PRICE (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={targetPrice}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#f5cf7b] font-bold text-sm outline-none tabular-nums"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProductMutation.isPending}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] transition-all disabled:opacity-50"
            >
              {updateProductMutation.isPending ? "Applying..." : "Apply Clearance Price"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal to record a stock write-down for unsellable or expired dead stock */
function WriteDownModal({
  score,
  onClose,
  onSuccess,
}: {
  score: DeadStockScore;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adjustStockMutation = useAdjustStock();
  const [quantity, setQuantity] = useState(Math.min(1, score.currentStock));
  const [reason, setReason] = useState("damage");
  const [note, setNote] = useState("Dead stock liquidation write-off");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMsg("Quantity must be at least 1 unit.");
      return;
    }
    setErrorMsg("");

    try {
      await adjustStockMutation.mutateAsync({
        productId: score.productId,
        quantityChange: -quantity, // negative movement
        reason,
        note,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to adjust inventory.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4 font-mono">
      <div className="bg-[#141418] border border-white/12 rounded-xl w-full max-w-md p-6 shadow-2xl text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-white/6">
          <h2 className="font-bold text-sm text-[#e8e6e3]">🗑️ Record Stock Write-Down</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <div className="mt-3 p-3 bg-white/4 rounded-lg">
          <p className="font-semibold text-[#e8e6e3] text-sm">{score.productName}</p>
          <p className="text-[11px] text-[#97979d] mt-1">
            Current Stock on Hand: <strong className="text-[#e8e6e3]">{score.currentStock} units</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              QUANTITY TO DEDUCT (UNITS)
            </label>
            <input
              type="number"
              min={1}
              max={score.currentStock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none tabular-nums"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              REASON CODE
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none"
            >
              <option value="damage">Damaged Goods / Broken Packaging</option>
              <option value="expired">Expired / Past Best-Before Date</option>
              <option value="spoilage">Spoilage / Perished Goods</option>
              <option value="shrinkage">Unaccounted Shrinkage / Missing</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#71717a] block mb-1">
              AUDIT NOTE
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustStockMutation.isPending}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#d45a4a] hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {adjustStockMutation.isPending ? "Deducting..." : "Confirm Write-Down"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeadStockPage;