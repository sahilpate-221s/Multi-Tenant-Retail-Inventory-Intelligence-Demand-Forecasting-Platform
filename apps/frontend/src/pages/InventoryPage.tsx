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
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-800">Inventory</h1>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white overflow-hidden">
        {isLoading && <LoadingState message="Loading inventory..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {inventory?.length === 0 && (
          <EmptyState title="No inventory yet" description="Stock levels appear here once products have movements." />
        )}
        {inventory && inventory.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Current Stock</th>
                <th className="px-4 py-2">Min Stock</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2 text-slate-500">{item.sku}</td>
                  <td className="px-4 py-2">
                    <span className={item.currentStock <= item.minStock ? "text-status-danger font-medium" : ""}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{item.minStock}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setHistoryItem(item)} className="text-xs text-slate-500 hover:underline mr-3">History</button>
                    <button onClick={() => setAdjustingItem(item)} className="text-xs text-slate-800 hover:underline">Adjust</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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