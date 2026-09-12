import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts, useCategories, useDeleteProduct } from "../hooks/useProducts";
import type { Product, ProductListParams } from "../lib/types";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import ProductFormModal from "../components/products/ProductFormModal";
import CategoryManagerModal from "../components/products/CategoryManagerModal";

function ProductsListPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<ProductListParams["sortBy"]>("name");
  const [sortOrder, setSortOrder] = useState<ProductListParams["sortOrder"]>("asc");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const { data: categories } = useCategories();
  const { data, isLoading, isError, refetch } = useProducts({
    search: search || undefined,
    categoryId: categoryId || undefined,
    isActive: isActive || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize: 20,
  });
  const deleteProduct = useDeleteProduct();

  function toggleSort(column: ProductListParams["sortBy"]) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4a853]">
            INVENTORY CATALOG
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
            Products & SKUs
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-xs font-mono px-3.5 py-2 border border-[rgba(255,255,255,0.08)] bg-[#1a1a22] hover:bg-[#22222c] hover:border-[rgba(212,168,83,0.3)] rounded-lg text-[#e8e6e3] transition-all"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setEditingProduct(null)}
            className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] rounded-lg transition-all shadow-[0_0_15px_rgba(212,168,83,0.2)] active:scale-95"
          >
            + New Product
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or SKU..."
          className="bg-[#0f0f13] border border-[rgba(255,255,255,0.08)] focus:border-[#d4a853] rounded-lg px-3.5 py-2 text-xs font-mono text-[#e8e6e3] placeholder-[#5c5c64] w-64 outline-none transition-colors"
        />
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="bg-[#0f0f13] border border-[rgba(255,255,255,0.08)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs font-mono text-[#e8e6e3] outline-none transition-colors"
        >
          <option value="" className="bg-[#121216] text-[#e8e6e3]">All categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id} className="bg-[#121216] text-[#e8e6e3]">
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value as "" | "true" | "false"); setPage(1); }}
          className="bg-[#0f0f13] border border-[rgba(255,255,255,0.08)] focus:border-[#d4a853] rounded-lg px-3 py-2 text-xs font-mono text-[#e8e6e3] outline-none transition-colors"
        >
          <option value="" className="bg-[#121216] text-[#e8e6e3]">All statuses</option>
          <option value="true" className="bg-[#121216] text-[#e8e6e3]">Active</option>
          <option value="false" className="bg-[#121216] text-[#e8e6e3]">Inactive</option>
        </select>
      </div>

      {/* Main Table Container */}
      <div className="mt-5 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {isLoading && <LoadingState message="Loading products catalog..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="No products found"
            description="Add your first physical SKU to begin tracking inventory."
            action={
              <button
                onClick={() => setEditingProduct(null)}
                className="text-xs font-mono font-semibold px-4 py-2 bg-[#d4a853] text-[#0c0c0e] rounded-lg"
              >
                + New Product
              </button>
            }
          />
        )}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3 cursor-pointer select-none hover:text-[#e8e6e3]" onClick={() => toggleSort("name")}>
                    Product Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-5 py-3 cursor-pointer select-none hover:text-[#e8e6e3]" onClick={() => toggleSort("sku")}>
                    SKU Code {sortBy === "sku" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-5 py-3 cursor-pointer select-none hover:text-[#e8e6e3]" onClick={() => toggleSort("sellingPrice")}>
                    Price {sortBy === "sellingPrice" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-[#181822]/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link to={`/products/${product.id}`} className="font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#97979d]">{product.sku}</td>
                    <td className="px-5 py-3.5 text-[#d4a853] font-semibold tabular-nums">
                      ₹{Number(product.sellingPrice).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          product.isActive
                            ? "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                            : "bg-[#25252d] text-[#97979d] border-[#303035]"
                        }`}
                      >
                        {product.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${product.name}?`)) deleteProduct.mutate(product.id); }}
                        className="text-xs text-[#d45a4a] hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs font-mono text-[#97979d]">
          <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded bg-[#181820] border border-[rgba(255,255,255,0.08)] text-[#e8e6e3] disabled:opacity-30 hover:bg-[#20202a] transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded bg-[#181820] border border-[rgba(255,255,255,0.08)] text-[#e8e6e3] disabled:opacity-30 hover:bg-[#20202a] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingProduct !== undefined && (
        <ProductFormModal product={editingProduct} onClose={() => setEditingProduct(undefined)} />
      )}
      {showCategoryManager && <CategoryManagerModal onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
}

export default ProductsListPage;