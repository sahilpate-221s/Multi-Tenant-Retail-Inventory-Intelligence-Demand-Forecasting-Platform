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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            SUPPLY NETWORK
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Vendor Directory
          </h1>
        </div>

        <button
          onClick={() => setEditingSupplier(null)}
          className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95"
        >
          + New Supplier
        </button>
      </div>

      {/* Main Table Container */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Loading supplier directory..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {suppliers?.length === 0 && (
          <EmptyState
            title="No suppliers linked"
            description="Add your first supplier partner to enable automated purchase order dispatch."
          />
        )}
        {suppliers && suppliers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Vendor / Entity</th>
                  <th className="px-5 py-3">Dispatch Contact Email</th>
                  <th className="px-5 py-3">Phone Channel</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#181822]/70 transition-colors group">
                    <td className="px-5 py-3.5 font-semibold text-[#e8e6e3]">
                      {s.name}
                    </td>
                    <td className="px-5 py-3.5 text-[#97979d]">{s.contactEmail || "—"}</td>
                    <td className="px-5 py-3.5 text-[#97979d]">{s.contactPhone || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setEditingSupplier(s)}
                        className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteSupplier.mutate(s.id); }}
                        className="text-xs text-[#d45a4a] hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingSupplier !== undefined && (
        <SupplierFormModal supplier={editingSupplier} onClose={() => setEditingSupplier(undefined)} />
      )}
    </div>
  );
}

export default SuppliersPage;