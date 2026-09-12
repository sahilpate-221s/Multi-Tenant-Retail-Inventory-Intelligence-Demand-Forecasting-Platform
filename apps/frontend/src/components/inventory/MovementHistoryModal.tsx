import { useMovementHistory } from "../../hooks/useInventory";
import LoadingState from "../states/LoadingState";
import EmptyState from "../states/EmptyState";

function MovementHistoryModal({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const { data: history, isLoading } = useMovementHistory(productId);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-lg p-6 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="font-bold text-sm text-[#e8e6e3]">Ledger Audit Trail</h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <p className="text-xs text-[#d4a853] mt-2 truncate font-semibold">{productName}</p>

        <div className="mt-4 max-h-80 overflow-y-auto">
          {isLoading && <LoadingState message="Fetching ledger records..." />}
          {history?.length === 0 && <EmptyState title="No prior movements logged" />}
          {history && history.length > 0 && (
            <table className="w-full text-xs text-left">
              <thead className="text-[#97979d] border-b border-[rgba(255,255,255,0.06)] uppercase text-[10px]">
                <tr>
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Variance</th>
                  <th className="py-2">Trigger Reason</th>
                  <th className="py-2">Operator Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {history.map((m) => (
                  <tr key={m.id} className="hover:bg-[#181822]/60">
                    <td className="py-2.5 text-[#97979d]">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className={`py-2.5 font-bold tabular-nums ${m.quantityChange > 0 ? "text-[#4aba7a]" : "text-[#d45a4a]"}`}>
                      {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                    </td>
                    <td className="py-2.5 text-[#e8e6e3]">{m.reason.replace("_", " ").toUpperCase()}</td>
                    <td className="py-2.5 text-[#5c5c64]">{m.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default MovementHistoryModal;