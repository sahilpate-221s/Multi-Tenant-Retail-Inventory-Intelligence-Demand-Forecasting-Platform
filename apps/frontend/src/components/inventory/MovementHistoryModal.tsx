import { useMovementHistory } from "../../hooks/useInventory";
import LoadingState from "../states/LoadingState";
import EmptyState from "../states/EmptyState";

function MovementHistoryModal({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const { data: history, isLoading } = useMovementHistory(productId);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">History — {productName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">Close</button>
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto">
          {isLoading && <LoadingState message="Loading history..." />}
          {history?.length === 0 && <EmptyState title="No movements yet" />}
          {history && history.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr><th className="py-1">Date</th><th className="py-1">Change</th><th className="py-1">Reason</th><th className="py-1">Note</th></tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className={`py-1.5 font-medium ${m.quantityChange > 0 ? "text-status-success" : "text-status-danger"}`}>
                      {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                    </td>
                    <td className="py-1.5 text-slate-500">{m.reason.replace("_", " ")}</td>
                    <td className="py-1.5 text-slate-400">{m.note || "—"}</td>
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