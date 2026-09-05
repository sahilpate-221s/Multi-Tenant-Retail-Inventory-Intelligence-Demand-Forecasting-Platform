import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Product } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";

function ForecastsListPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products-for-forecast"],
    queryFn: () => apiClient.get<Product[]>("/api/products?pageSize=100"),
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-800">Forecasts</h1>
      <p className="mt-1 text-sm text-slate-500">Select a product to view or generate its demand forecast.</p>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white overflow-hidden">
        {isLoading && <LoadingState message="Loading products..." />}
        {products?.length === 0 && <EmptyState title="No products yet" />}
        {products && products.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-slate-500">{p.sku}</td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/forecasts/${p.id}`} className="text-xs text-slate-800 hover:underline">
                      View Forecast →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ForecastsListPage;