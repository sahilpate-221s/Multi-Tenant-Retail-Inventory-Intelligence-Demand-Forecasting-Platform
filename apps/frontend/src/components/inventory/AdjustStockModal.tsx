import { useState } from "react";
import { useAdjustStock } from "../../hooks/useInventory";
import { ApiError } from "../../lib/apiClient";
import type { InventoryItem } from "../../lib/types";

const REASONS = ["restock", "manual_adjustment", "correction", "damage", "return"] as const;

function AdjustStockModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const adjustStock = useAdjustStock();
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("restock");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a positive quantity.");
      return;
    }
    const quantityChange = direction === "add" ? parsedAmount : -parsedAmount;
    try {
      await adjustStock.mutateAsync({ productId: item.productId, quantityChange, reason, note: note || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-sm p-6 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="font-bold text-sm text-[#e8e6e3]">Adjust Stock</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <p className="text-xs text-[#97979d] mt-3 truncate">{item.productName}</p>
        <p className="text-[11px] text-[#5c5c64]">Current ledger balance: <strong className="text-[#e8e6e3]">{item.currentStock}</strong></p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setDirection("add")}
            className={`flex-1 text-xs py-2 rounded-lg border font-semibold transition-all ${
              direction === "add"
                ? "bg-[#4aba7a]/15 border-[#4aba7a] text-[#4aba7a]"
                : "border-[rgba(255,255,255,0.08)] text-[#97979d] hover:text-[#e8e6e3]"
            }`}
          >
            + Inbound Stock
          </button>
          <button
            onClick={() => setDirection("remove")}
            className={`flex-1 text-xs py-2 rounded-lg border font-semibold transition-all ${
              direction === "remove"
                ? "bg-[#d45a4a]/15 border-[#d45a4a] text-[#d45a4a]"
                : "border-[rgba(255,255,255,0.08)] text-[#97979d] hover:text-[#e8e6e3]"
            }`}
          >
            - Outbound / Waste
          </button>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quantity change"
          className="w-full mt-3 bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
        />

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as typeof reason)}
          className="w-full mt-3 bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
        >
          {REASONS.map((r) => (
            <option key={r} value={r} className="bg-[#121216] text-[#e8e6e3]">
              {r.replace("_", " ").toUpperCase()}
            </option>
          ))}
        </select>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Audit log note (optional)"
          className="w-full mt-3 bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
        />

        {error && <p className="text-xs text-[#d45a4a] mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[#97979d] hover:text-[#e8e6e3] hover:bg-[#1a1a22] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={adjustStock.isPending}
            className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {adjustStock.isPending ? "Committing..." : "Commit Ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdjustStockModal;