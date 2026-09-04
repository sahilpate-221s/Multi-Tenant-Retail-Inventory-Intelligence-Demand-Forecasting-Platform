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
      setError("Enter a positive amount.");
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-5">
        <h2 className="font-semibold text-slate-800">Adjust Stock — {item.productName}</h2>
        <p className="text-xs text-slate-400 mt-1">Current stock: {item.currentStock}</p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setDirection("add")}
            className={`flex-1 text-sm py-1.5 rounded-md border ${direction === "add" ? "bg-status-success-bg border-status-success text-status-success" : "border-slate-300 text-slate-500"}`}
          >
            Add stock
          </button>
          <button
            onClick={() => setDirection("remove")}
            className={`flex-1 text-sm py-1.5 rounded-md border ${direction === "remove" ? "bg-status-danger-bg border-status-danger text-status-danger" : "border-slate-300 text-slate-500"}`}
          >
            Remove stock
          </button>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quantity"
          className="w-full mt-3 border border-slate-300 rounded-md px-3 py-2 text-sm"
        />

        <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="w-full mt-3 border border-slate-300 rounded-md px-3 py-2 text-sm">
          {REASONS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full mt-3 border border-slate-300 rounded-md px-3 py-2 text-sm" />

        {error && <p className="text-sm text-status-danger mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={adjustStock.isPending}
            className="bg-slate-900 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
          >
            {adjustStock.isPending ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdjustStockModal;