import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "../lib/apiClient";
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

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleQuickReturn}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-[#d4a853] border border-[rgba(212,168,83,0.3)] transition-all text-xs font-semibold"
              >
                Record Return RMA
              </button>
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