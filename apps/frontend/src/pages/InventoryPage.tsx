import { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import type { InventoryItem } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import AdjustStockModal from "../components/inventory/AdjustStockModal";
import MovementHistoryModal from "../components/inventory/MovementHistoryModal";

function InventoryPage() {
  const { data: inventory, isLoading, isError, refetch } = useInventory();
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            SPATIAL TELEMETRY
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Real-Time Inventory Ledger
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#97979d]">
          <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
          <span>LEDGER CONNECTED</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Querying real-time ledger..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {inventory?.length === 0 && (
          <EmptyState
            title="No inventory records"
            description="Stock levels will appear here as soon as products register inbound/outbound movements."
          />
        )}
        {inventory && inventory.length > 0 && (
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
                {inventory.map((item) => {
                  const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-[#181822]/70 transition-colors group">
                      <td className="px-5 py-3.5 font-semibold text-[#e8e6e3]">
                        {item.productName}
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d]">{item.sku}</td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-[#e8e6e3]">
                        <span className={isLow ? "text-[#d45a4a] font-bold" : "text-[#e8e6e3]"}>
                          {item.currentStock.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d] tabular-nums">
                        {item.minStock.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isLow
                              ? "bg-[#d45a4a]/15 text-[#d45a4a] border-[#d45a4a]/30"
                              : "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                          }`}
                        >
                          {isLow ? "BELOW SAFETY MIN" : "SUFFICIENT"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setHistoryItem(item)}
                          className="text-xs text-[#97979d] hover:text-[#e8e6e3] transition-colors mr-3"
                        >
                          History
                        </button>
                        <button
                          onClick={() => setAdjustingItem(item)}
                          className="px-2.5 py-1 rounded bg-[#1c1c24] hover:bg-[#252530] text-[#d4a853] border border-[rgba(212,168,83,0.3)] transition-all font-semibold"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustingItem && <AdjustStockModal item={adjustingItem} onClose={() => setAdjustingItem(null)} />}
      {historyItem && (
        <MovementHistoryModal productId={historyItem.productId} productName={historyItem.productName} onClose={() => setHistoryItem(null)} />
      )}
    </div>
  );
}

export default InventoryPage;