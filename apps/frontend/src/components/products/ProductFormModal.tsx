import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategories, useCreateProduct, useUpdateProduct } from "../../hooks/useProducts";
import type { Product } from "../../lib/types";
import { ApiError } from "../../lib/apiClient";

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(50),
  barcode: z.string().max(50).optional(),
  categoryId: z.string().optional(),
  costPrice: z
    .string()
    .min(1, "Cost price is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  sellingPrice: z
    .string()
    .min(1, "Selling price is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof productSchema>;

interface Props {
  product?: Product | null;
  onClose: () => void;
}

function ProductFormModal({ product, onClose }: Props) {
  const isEditing = Boolean(product);
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      categoryId: product?.categoryId ?? "",
      costPrice: product?.costPrice ? String(product.costPrice) : "",
      sellingPrice: product?.sellingPrice ? String(product.sellingPrice) : "",
      isActive: product?.isActive ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        sku: values.sku,
        barcode: values.barcode || undefined,
        categoryId: values.categoryId || undefined,
        costPrice: Number(values.costPrice),
        sellingPrice: Number(values.sellingPrice),
        isActive: values.isActive ?? true,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, data: payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-[#141418] border border-[rgba(255,255,255,0.12)] rounded-xl w-full max-w-md p-6 shadow-2xl font-mono text-xs text-[#e8e6e3]">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="font-bold text-sm text-[#e8e6e3]">
            {isEditing ? "Edit Product Definition" : "Register New Physical SKU"}
          </h2>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3]">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">PRODUCT TITLE</label>
            <input
              {...register("name")}
              placeholder="e.g. ARM Cortex-M4 Microcontroller"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
            {errors.name && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">SKU IDENTIFIER</label>
            <input
              {...register("sku")}
              placeholder="e.g. MCU-STM32-401"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
            {errors.sku && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.sku.message}</p>}
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">BARCODE / RFID TAG</label>
            <input
              {...register("barcode")}
              placeholder="Optional barcode string"
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">CATEGORY</label>
            <select
              {...register("categoryId")}
              className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
            >
              <option value="" className="bg-[#121216] text-[#97979d]">No category assigned</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#121216] text-[#e8e6e3]">{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">COST PRICE (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register("costPrice")}
                placeholder="0.00"
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              />
              {errors.costPrice && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.costPrice.message}</p>}
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#5c5c64] block mb-1">LIST PRICE (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register("sellingPrice")}
                placeholder="0.00"
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              />
              {errors.sellingPrice && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.sellingPrice.message}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 mt-1 text-[#e8e6e3] cursor-pointer">
            <input type="checkbox" {...register("isActive")} className="accent-[#d4a853]" />
            <span>Active in Catalog</span>
          </label>

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
              {isSubmitting ? "Saving..." : isEditing ? "Update SKU" : "Register Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;