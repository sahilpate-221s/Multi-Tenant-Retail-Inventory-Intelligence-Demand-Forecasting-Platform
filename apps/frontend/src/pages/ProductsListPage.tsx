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
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-sm px-3 py-1.5 border border-slate-300 rounded-md text-slate-600"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setEditingProduct(null)}
            className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md"
          >
            + New Product
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name..."
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-56"
        />
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value as "" | "true" | "false"); setPage(1); }}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white overflow-hidden">
        {isLoading && <LoadingState message="Loading products..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="No products yet"
            description="Add your first product to get started."
            action={
              <button
                onClick={() => setEditingProduct(null)}
                className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md"
              >
                + New Product
              </button>
            }
          />
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("name")}>Name</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("sku")}>SKU</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("sellingPrice")}>Price</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link to={`/products/${product.id}`} className="text-slate-800 hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{product.sku}</td>
                  <td className="px-4 py-2">₹{product.sellingPrice}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${product.isActive ? "bg-status-success-bg text-status-success" : "bg-slate-100 text-slate-500"}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditingProduct(product)} className="text-xs text-slate-500 hover:underline mr-3">
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${product.name}?`)) deleteProduct.mutate(product.id); }}
                      className="text-xs text-status-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-30">Previous</button>
          <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="disabled:opacity-30">Next</button>
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