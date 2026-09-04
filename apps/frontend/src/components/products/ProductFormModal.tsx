import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategories, useCreateProduct, useUpdateProduct } from "../../hooks/useProducts";
import type { Product } from "../../lib/types";
import { ApiError } from "../../lib/apiClient";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().nonnegative("Must be 0 or more"),
  sellingPrice: z.coerce.number().nonnegative("Must be 0 or more"),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function ProductFormModal({
  product,
  onClose,
}: {
  product?: Product | null;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = Boolean(product);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      categoryId: product?.categoryId ?? "",
      costPrice: product ? Number(product.costPrice) : 0,
      sellingPrice: product ? Number(product.sellingPrice) : 0,
      isActive: product?.isActive ?? true,
    },
  });

  async function onSubmit(values: ProductFormValues) {
    try {
      const payload = {
        ...values,
        categoryId: values.categoryId || null,
        barcode: values.barcode || undefined,
      };
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <h2 className="font-semibold text-slate-800">
          {isEditing ? "Edit Product" : "New Product"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div>
            <input
              {...register("name")}
              placeholder="Product name"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            {errors.name && <p className="text-xs text-status-danger mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <input
              {...register("sku")}
              placeholder="SKU"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            {errors.sku && <p className="text-xs text-status-danger mt-1">{errors.sku.message}</p>}
          </div>

          <input
            {...register("barcode")}
            placeholder="Barcode (optional)"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />

          <select
            {...register("categoryId")}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">No category</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                step="0.01"
                {...register("costPrice")}
                placeholder="Cost price"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
              {errors.costPrice && <p className="text-xs text-status-danger mt-1">{errors.costPrice.message}</p>}
            </div>
            <div className="flex-1">
              <input
                type="number"
                step="0.01"
                {...register("sellingPrice")}
                placeholder="Selling price"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
              {errors.sellingPrice && <p className="text-xs text-status-danger mt-1">{errors.sellingPrice.message}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...register("isActive")} />
            Active
          </label>

          {errors.root && <p className="text-sm text-status-danger">{errors.root.message}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;