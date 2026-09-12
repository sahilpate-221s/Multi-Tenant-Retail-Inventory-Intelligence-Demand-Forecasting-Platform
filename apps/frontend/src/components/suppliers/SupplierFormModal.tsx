import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSupplier, useUpdateSupplier } from "../../hooks/useSuppliers";
import type { Supplier } from "../../lib/types";
import { ApiError } from "../../lib/apiClient";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  reliabilityNotes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

function SupplierFormModal({ supplier, onClose }: { supplier?: Supplier | null; onClose: () => void }) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEditing = Boolean(supplier);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      contactEmail: supplier?.contactEmail ?? "",
      contactPhone: supplier?.contactPhone ?? "",
      reliabilityNotes: supplier?.reliabilityNotes ?? "",
    },
  });

  async function onSubmit(values: SupplierFormValues) {
    try {
      const payload = { ...values, contactEmail: values.contactEmail || undefined };
      if (isEditing && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...payload });
      } else {
        await createSupplier.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError("root", { message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-md p-6 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="font-bold text-sm text-[#e8e6e3]">
            {isEditing ? "Edit Supplier Partner" : "Register Vendor Entity"}
          </h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">VENDOR ENTITY NAME</label>
            <input
              {...register("name")}
              placeholder="e.g. Arrow Electronics Asia"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
            {errors.name && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">DISPATCH EMAIL</label>
            <input
              {...register("contactEmail")}
              placeholder="orders@supplier.com"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
            {errors.contactEmail && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.contactEmail.message}</p>}
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">PHONE CHANNEL</label>
            <input
              {...register("contactPhone")}
              placeholder="+1 (800) 555-0199"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">RELIABILITY / SLA NOTES</label>
            <textarea
              {...register("reliabilityNotes")}
              placeholder="Average lead times, warehouse docks, volume discounts..."
              rows={2}
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
          </div>

          {errors.root && <p className="text-xs text-[#d45a4a]">{errors.root.message}</p>}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-[#97979d] hover:text-[#e8e6e3] hover:bg-[#1a1a22] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Vendor" : "Register Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SupplierFormModal;