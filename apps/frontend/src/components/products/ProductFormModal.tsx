import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategories, useCreateProduct, useUpdateProduct } from "../../hooks/useProducts";
import { useSuppliers } from "../../hooks/useSuppliers";
import type { Product } from "../../lib/types";
import { ApiError } from "../../lib/apiClient";
import CameraBarcodeScanner, { type ScanResult } from "../scanner/CameraBarcodeScanner";
import { lookupBarcodeInfo } from "../../lib/barcodeLookup";

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(50),
  barcode: z.string().max(50).optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z
    .string()
    .min(1, "Cost price is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  sellingPrice: z
    .string()
    .min(1, "Selling price is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  initialStock: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), "Must be 0 or greater"),
  minStock: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), "Must be 0 or greater"),
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
  const { data: suppliers } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannerResult, setScannerResult] = useState<ScanResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const handleBarcodeIdentified = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setValue("barcode", trimmed, { shouldValidate: true });
    setIsLookingUp(true);
    setScannerResult({ code: trimmed, status: "searching" });
    setLookupMessage(`Looking up barcode ${trimmed}...`);

    try {
      const info = await lookupBarcodeInfo(trimmed);
      if (info && info.name) {
        setScannerResult({ code: trimmed, status: "found", productName: info.name });
        setLookupMessage(`✓ Auto-filled: ${info.name}`);
        setValue("name", info.name, { shouldValidate: true });
        if (!watch("sku")) {
          setValue("sku", info.suggestedSku || `SKU-${trimmed.slice(-6)}`, { shouldValidate: true });
        }
        setTimeout(() => setIsCameraOpen(false), 1100);
      } else {
        setScannerResult({ code: trimmed, status: "not_found" });
        setLookupMessage(`Barcode ${trimmed} saved (enter name & price manually)`);
        if (!watch("sku")) {
          setValue("sku", `SKU-${trimmed.slice(-6)}`, { shouldValidate: true });
        }
        setTimeout(() => setIsCameraOpen(false), 1100);
      }
    } catch {
      setScannerResult({ code: trimmed, status: "not_found" });
      setTimeout(() => setIsCameraOpen(false), 1000);
    } finally {
      setIsLookingUp(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      categoryId: product?.categoryId ?? "",
      supplierId: "",
      costPrice: product?.costPrice ? String(product.costPrice) : "",
      sellingPrice: product?.sellingPrice ? String(product.sellingPrice) : "",
      initialStock: "0",
      minStock: "5",
      isActive: product?.isActive ?? true,
    },
  });

  const cost = Number(watch("costPrice") || 0);
  const sell = Number(watch("sellingPrice") || 0);
  const marginAmt = sell - cost;
  const marginPct = sell > 0 ? ((marginAmt / sell) * 100).toFixed(1) : "0.0";

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
        await updateProduct.mutateAsync({ id: product.id, ...payload });
      } else {
        await createProduct.mutateAsync({
          ...payload,
          initialStock: values.initialStock ? parseInt(values.initialStock, 10) : 0,
          minStock: values.minStock ? parseInt(values.minStock, 10) : 5,
          supplierId: values.supplierId || null,
        });
      }
      onClose();
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 pt-16 pb-6 overflow-hidden">
      <div className="bg-[#141418] border border-white/12 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl font-mono text-xs text-[#e8e6e3] overflow-hidden">
        {/* Fixed Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/6 shrink-0 bg-[#16161d]">
          <div>
            <h2 className="font-bold text-sm text-[#e8e6e3]">
              {isEditing ? "Edit Product Details" : "Add New Product"}
            </h2>
            <p className="text-[11px] text-[#71717a] mt-0.5 font-sans">
              Enter product title, item code, prices, and opening stock.
            </p>
          </div>
          <button onClick={onClose} className="text-[#97979d] hover:text-[#e8e6e3] cursor-pointer text-sm p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="px-6 py-4 overflow-y-auto flex-1 flex flex-col gap-3.5">
            <div>
              <label className="text-[10px] uppercase text-[#71717a] font-semibold block mb-1">PRODUCT TITLE</label>
              <input
                {...register("name")}
                placeholder="e.g. Tata Tea Premium 500g, Parle-G 1kg"
                className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              />
              {errors.name && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase text-[#71717a] font-semibold">
                  ITEM CODE / SKU (UNIQUE ID)
                </label>
                <span className="text-[10px] text-[#71717a]">Unique short code</span>
              </div>
              <input
                {...register("sku")}
                placeholder="e.g. TEA-TAT-500, PARLE-G-100"
                className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors"
              />
              {errors.sku && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.sku.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase text-[#71717a] font-semibold">BARCODE / SCANNER CODE</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-[10px] text-[#f5cf7b] hover:text-white hover:underline font-mono cursor-pointer flex items-center gap-1"
                  >
                    <span>📷 Scan from Box</span>
                  </button>
                  <span className="text-[#3f3f46]">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = "890" + Math.floor(100000000 + Math.random() * 900000000).toString();
                      setValue("barcode", generated, { shouldValidate: true });
                    }}
                    className="text-[10px] text-[#d4a853] hover:underline font-mono cursor-pointer"
                  >
                    ⚡ Generate Barcode
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  {...register("barcode")}
                  placeholder="Scan with phone camera, USB scanner gun or leave blank"
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors pr-24"
                />
                <button
                  type="button"
                  disabled={isLookingUp}
                  onClick={() => {
                    const bc = watch("barcode");
                    if (bc) handleBarcodeIdentified(bc);
                  }}
                  className="absolute right-1.5 top-1.5 px-2 py-1 rounded text-[10px] font-bold bg-[#d4a853]/20 hover:bg-[#d4a853]/30 text-[#f5cf7b] border border-[#d4a853]/30 cursor-pointer disabled:opacity-40"
                >
                  {isLookingUp ? "Looking up..." : "🔍 Auto-fill"}
                </button>
              </div>
              {lookupMessage && (
                <p className="text-[11px] text-[#f5cf7b] mt-1 font-medium">{lookupMessage}</p>
              )}
              {errors.barcode && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.barcode.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-[#71717a] font-semibold block mb-1">CATEGORY</label>
                <select
                  {...register("categoryId")}
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#121216] text-[#97979d]">No category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#121216] text-[#e8e6e3]">{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#71717a] font-semibold block mb-1">PRIMARY SUPPLIER</label>
                <select
                  {...register("supplierId")}
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#121216] text-[#97979d]">Assign supplier...</option>
                  {suppliers?.map((sup) => (
                    <option key={sup.id} value={sup.id} className="bg-[#121216] text-[#e8e6e3]">{sup.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] uppercase text-[#71717a] font-semibold block mb-1">COST PRICE (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("costPrice")}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none tabular-nums"
                />
                {errors.costPrice && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.costPrice.message}</p>}
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase text-[#71717a] font-semibold block mb-1">SELLING PRICE (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("sellingPrice")}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-2 text-[#e8e6e3] outline-none tabular-nums"
                />
                {errors.sellingPrice && <p className="text-[11px] text-[#d45a4a] mt-1">{errors.sellingPrice.message}</p>}
              </div>
            </div>

            {/* Real-time Margin & Profit Calculator */}
            {sell > 0 && (
              <div className={`p-2.5 rounded-lg text-xs border flex items-center justify-between ${
                marginAmt >= 0 
                  ? "bg-[#4aba7a]/10 border-[#4aba7a]/25 text-[#4aba7a]" 
                  : "bg-[#d45a4a]/10 border-[#d45a4a]/25 text-[#d45a4a]"
              }`}>
                <span>Profit Margin:</span>
                <span className="font-bold font-mono">
                  ₹{marginAmt.toFixed(2)} ({marginPct}%)
                </span>
              </div>
            )}

            {/* Initial Stock & Safety Buffer */}
            {!isEditing && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/8 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-[#d4a853] tracking-wider block">
                  INITIAL INVENTORY SETUP
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#97979d] block mb-1">OPENING SHELF STOCK</label>
                    <input
                      type="number"
                      min="0"
                      {...register("initialStock")}
                      placeholder="0"
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-1.5 text-[#e8e6e3] outline-none"
                    />
                    {errors.initialStock && <p className="text-[10px] text-[#d45a4a] mt-0.5">{errors.initialStock.message}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] text-[#97979d] block mb-1">SAFETY REORDER MIN</label>
                    <input
                      type="number"
                      min="0"
                      {...register("minStock")}
                      placeholder="5"
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#d4a853] rounded-lg px-3 py-1.5 text-[#e8e6e3] outline-none"
                    />
                    {errors.minStock && <p className="text-[10px] text-[#d45a4a] mt-0.5">{errors.minStock.message}</p>}
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 mt-1 text-[#e8e6e3] cursor-pointer select-none">
              <input type="checkbox" {...register("isActive")} className="accent-[#d4a853] cursor-pointer w-3.5 h-3.5" />
              <span className="text-xs">Active in Catalog & Billing</span>
            </label>

            {errors.root && <p className="text-xs text-[#d45a4a]">{errors.root.message}</p>}
          </div>

          {/* Fixed Footer */}
          <div className="px-6 py-3 border-t border-white/6 flex justify-end gap-2 shrink-0 bg-[#16161d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-[#97979d] hover:text-[#e8e6e3] hover:bg-[#1a1a22] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] font-semibold px-4 py-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>

      <CameraBarcodeScanner
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setScannerResult(null);
        }}
        onScan={handleBarcodeIdentified}
        scanResult={scannerResult}
      />
    </div>
  );
}

export default ProductFormModal;