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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <h2 className="font-semibold text-slate-800">{isEditing ? "Edit Supplier" : "New Supplier"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div>
            <input {...register("name")} placeholder="Supplier name" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            {errors.name && <p className="text-xs text-status-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input {...register("contactEmail")} placeholder="Contact email (optional)" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            {errors.contactEmail && <p className="text-xs text-status-danger mt-1">{errors.contactEmail.message}</p>}
          </div>
          <input {...register("contactPhone")} placeholder="Contact phone (optional)" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <textarea {...register("reliabilityNotes")} placeholder="Reliability notes (optional)" rows={2} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          {errors.root && <p className="text-sm text-status-danger">{errors.root.message}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50">
              {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SupplierFormModal;