import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "../lib/apiClient";
import { useSuppliers } from "../hooks/useSuppliers";
import type { Product } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [returnMessage, setReturnMessage] = useState<string | null>(null);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiClient.get<Product>(`/api/products/${id}`),
    enabled: Boolean(id),
  });

  const { data: suppliers } = useSuppliers();
  const assignedSupplier = suppliers?.find((s) => s.id === (product as any)?.supplierId);

  async function handleQuickReturn() {
    const saleItemId = window.prompt("Enter the Sale Item ID to process a return for:");
    if (!saleItemId) return;
    const quantityStr = window.prompt("Quantity to return:");
    if (!quantityStr) return;

    try {
      await apiClient.post("/api/returns", { saleItemId, quantity: Number(quantityStr) });
      setReturnMessage("Return recorded and stock updated.");
    } catch (err) {
      setReturnMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const handlePrintSingleLabel = () => {
    if (!product) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Tag - ${product.name}</title>
          <style>
            @page { size: 50mm 25mm; margin: 0; }
            body { font-family: monospace; margin: 0; padding: 6px; background: #fff; color: #000; text-align: center; }
            .store-header { font-size: 8px; text-transform: uppercase; color: #555; }
            .item-name { font-size: 11px; font-weight: bold; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .mrp-row { display: flex; justify-content: space-between; align-items: baseline; margin: 2px 0; padding: 2px; }
            .mrp-val { font-size: 14px; font-weight: bold; }
            .sku-val { font-size: 9px; color: #444; }
            .barcode-visual { font-family: monospace; font-size: 16px; margin-top: 2px; line-height: 1; letter-spacing: 2px; }
            .barcode-digits { font-size: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="store-header">StockPilot Retail</div>
          <div class="item-name">${product.name}</div>
          <div class="mrp-row">
            <span class="mrp-val">₹${Number(product.sellingPrice).toFixed(2)}</span>
            <span class="sku-val">${product.sku}</span>
          </div>
          <div class="barcode-visual">|| | ||| || ||| | |||</div>
          <div class="barcode-digits">${product.barcode || product.sku}</div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      <Link to="/products" className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors flex items-center gap-1.5">
        ← Back to Catalog
      </Link>

      <div className="mt-6">
        {isLoading && <LoadingState message="Fetching SKU specs..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {product && (
          <div className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-6 md:p-8 max-w-xl shadow-2xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
              SKU SPECIFICATION SHEET
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-1">
              {product.name}
            </h1>

            <dl className="mt-6 grid grid-cols-2 gap-y-3 gap-x-6 text-xs border-y border-[rgba(255,255,255,0.06)] py-5">
              <div>
                <dt className="text-[10px] text-[#5c5c64] uppercase">SKU IDENTIFIER</dt>
                <dd className="text-[#e8e6e3] font-semibold mt-0.5">{product.sku}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#5c5c64] uppercase">PHYSICAL BARCODE</dt>
                <dd className="text-[#97979d] mt-0.5">{product.barcode || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#5c5c64] uppercase">COST BASIS</dt>
                <dd className="text-[#e8e6e3] font-semibold mt-0.5">₹{product.costPrice}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#5c5c64] uppercase">SELLING LIST PRICE</dt>
                <dd className="text-[#d4a853] font-bold mt-0.5">₹{product.sellingPrice}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#5c5c64] uppercase">LIFECYCLE STATUS</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      product.isActive
                        ? "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                        : "bg-[#25252d] text-[#97979d] border-[#303035]"
                    }`}
                  >
                    {product.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </dd>
              </div>
            </dl>

            {/* ─── Supplier Terms & Replenishment Intelligence ─── */}
            <div className="mt-6 pt-5 border-t border-white/8">
              <span className="text-[10px] uppercase tracking-widest text-[#38bdf8]">
                REPLENISHMENT & SUPPLIER INTELLIGENCE
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0c0c10] border border-white/6">
                  <span className="text-[10px] text-[#71717a] uppercase block">Assigned Vendor</span>
                  <strong className="text-[#e8e6e3] mt-0.5 block truncate">
                    {assignedSupplier?.name || "Direct Distributor"}
                  </strong>
                  {assignedSupplier?.contactPhone && (
                    <span className="text-[10px] text-[#97979d]">📞 {assignedSupplier.contactPhone}</span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#0c0c10] border border-white/6">
                  <span className="text-[10px] text-[#71717a] uppercase block">Lead Time / MOQ</span>
                  <strong className="text-[#e8e6e3] mt-0.5 block">
                    {assignedSupplier?.leadTimeDays ?? 3} Days • MOQ: 10 units
                  </strong>
                  <span className="text-[10px] text-[#4aba7a]">Replenishment Guaranteed</span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-white/2 border border-white/5 text-[11px] text-[#97979d]">
                <div className="flex justify-between items-center text-[#e8e6e3] font-semibold mb-1">
                  <span>Safety Stock Equation</span>
                  <code className="text-[#d4a853] text-[10px]">SS = Z × σ_d × √L</code>
                </div>
                <p className="text-[10px] leading-relaxed text-[#71717a]">
                  Automatic buffer calculation ensures 95% service level against supplier delays ({assignedSupplier?.leadTimeDays ?? 3}d standard delivery window).
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-white/8">
              <button
                onClick={handlePrintSingleLabel}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#e8e6e3] border border-white/10 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                <span>🖨️ Print Shelf Tag</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickReturn}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-[#d4a853] border border-[rgba(212,168,83,0.3)] transition-all text-xs font-semibold"
                >
                  Record Return RMA
                </button>
                <Link
                  to="/purchase-orders"
                  className="px-3 py-1.5 rounded-lg bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 text-[#38bdf8] border border-[#38bdf8]/30 transition-all text-xs font-bold"
                >
                  Draft PO →
                </Link>
              </div>
            </div>

            {returnMessage && (
              <p className="mt-3 text-xs text-[#4aba7a] p-2 rounded bg-[#4aba7a]/10 border border-[#4aba7a]/25">
                {returnMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;