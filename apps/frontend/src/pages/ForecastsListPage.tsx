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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
          PREDICTIVE VECTORS
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
          Demand Forecasting Hub
        </h1>
        <p className="mt-1 text-xs font-mono text-[#97979d]">
          Select an SKU to inspect algorithmic demand projections and confidence intervals.
        </p>
      </div>

      {/* Main Table */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Loading catalog for forecasting..." />}
        {products?.length === 0 && <EmptyState title="No products found" />}
        {products && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">SKU Code</th>
                  <th className="px-5 py-3 text-right">Forecast Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#181822]/70 transition-colors group">
                    <td className="px-5 py-3.5 font-semibold text-[#e8e6e3]">
                      {p.name}
                    </td>
                    <td className="px-5 py-3.5 text-[#97979d]">{p.sku}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/forecasts/${p.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-[#d4a853] hover:text-[#e8be66] border border-[rgba(212,168,83,0.3)] transition-all font-semibold inline-block"
                      >
                        Inspect Projections →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForecastsListPage;