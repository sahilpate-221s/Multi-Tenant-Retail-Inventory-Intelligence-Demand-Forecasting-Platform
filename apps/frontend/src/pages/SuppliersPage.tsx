import { useState } from "react";
import { useSuppliers, useDeleteSupplier } from "../hooks/useSuppliers";
import type { Supplier } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";

function SuppliersPage() {
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null | undefined>(undefined);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Suppliers</h1>
        <button onClick={() => setEditingSupplier(null)} className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md">
          + New Supplier
        </button>
      </div>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white overflow-hidden">
        {isLoading && <LoadingState message="Loading suppliers..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {suppliers?.length === 0 && (
          <EmptyState title="No suppliers yet" description="Add your first supplier to start linking products to them." />
        )}
        {suppliers && suppliers.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.contactEmail || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{s.contactPhone || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditingSupplier(s)} className="text-xs text-slate-500 hover:underline mr-3">Edit</button>
                    <button
                      onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteSupplier.mutate(s.id); }}
                      className="text-xs text-status-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingSupplier !== undefined && (
        <SupplierFormModal supplier={editingSupplier} onClose={() => setEditingSupplier(undefined)} />
      )}
    </div>
  );
}

export default SuppliersPage;