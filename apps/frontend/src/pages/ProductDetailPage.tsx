import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Product } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiClient.get<Product>(`/api/products/${id}`),
    enabled: Boolean(id),
  });

  return (
    <div className="p-8">
      <Link to="/products" className="text-sm text-slate-500 hover:underline">← Back to Products</Link>

      <div className="mt-4">
        {isLoading && <LoadingState message="Loading product..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {product && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-lg">
            <h1 className="text-xl font-semibold text-slate-800">{product.name}</h1>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">SKU</dt><dd>{product.sku}</dd>
              <dt className="text-slate-400">Barcode</dt><dd>{product.barcode || "—"}</dd>
              <dt className="text-slate-400">Cost Price</dt><dd>₹{product.costPrice}</dd>
              <dt className="text-slate-400">Selling Price</dt><dd>₹{product.sellingPrice}</dd>
              <dt className="text-slate-400">Status</dt><dd>{product.isActive ? "Active" : "Inactive"}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;