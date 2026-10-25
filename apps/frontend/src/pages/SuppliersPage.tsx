import { useState, useEffect } from "react";
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
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".actions-menu-container")) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

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
                  <th className="px-5 py-3">WhatsApp & Phone</th>
                  <th className="px-5 py-3">Notes & Terms</th>
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
                    <td className="px-5 py-3.5">
                      {s.contactPhone ? (
                        <a
                          href={`https://wa.me/${s.contactPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#25D366] hover:underline flex items-center gap-1 font-semibold"
                          title="Open WhatsApp chat with supplier"
                        >
                          <span>💬 {s.contactPhone}</span>
                        </a>
                      ) : (
                        <span className="text-[#97979d]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#97979d] text-[11px] max-w-[200px] truncate">
                      {s.reliabilityNotes || "Standard 3d SLA"}
                    </td>
                    <td className="px-5 py-3.5 text-right relative actions-menu-container">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === s.id ? null : s.id);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            openActionId === s.id
                              ? "bg-[#20202e] border-[#d4a853]/60 text-[#e8e6e3]"
                              : "bg-[#16161f] border-white/10 text-[#97979d] hover:text-[#e8e6e3] hover:border-white/20"
                          }`}
                        >
                          <span>Actions</span>
                          <svg className={`w-3 h-3 transition-transform ${openActionId === s.id ? "rotate-180 text-[#d4a853]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {openActionId === s.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-[#181824] border border-white/10 rounded-lg shadow-2xl py-1 z-30 divide-y divide-white/5 animate-in fade-in duration-100">
                            <div className="py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setEditingSupplier(s);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#e8e6e3] hover:bg-[#222232] hover:text-[#d4a853] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <span>✏️ Edit</span>
                              </button>
                            </div>
                            <div className="py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  if (confirm(`Delete ${s.name}?`)) deleteSupplier.mutate(s.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <span>🗑️ Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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