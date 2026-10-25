import { useState, useEffect } from "react";
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
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".actions-menu-container")) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

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

  const handlePrintShelfLabels = () => {
    const productsToPrint = data?.items || [];
    if (productsToPrint.length === 0) {
      alert("No products found to print labels for.");
      return;
    }

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Barcode Labels - StockPilot</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { font-family: monospace; margin: 0; padding: 10px; background: #fff; color: #000; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
            .label-card {
              border: 1.5px dashed #333;
              padding: 8px;
              border-radius: 4px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
            }
            .store-header { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
            .item-name { font-size: 11px; font-weight: bold; margin: 4px 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .mrp-row { display: flex; justify-content: space-between; align-items: baseline; margin: 4px 0; padding: 2px 4px; background: #f0f0f0; border-radius: 2px; }
            .mrp-val { font-size: 13px; font-weight: bold; }
            .sku-val { font-size: 9px; color: #444; }
            .barcode-visual {
              font-family: monospace;
              font-size: 18px;
              letter-spacing: 2px;
              margin-top: 4px;
              line-height: 1;
              color: #111;
            }
            .barcode-digits { font-size: 9px; letter-spacing: 1px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${productsToPrint.map((p) => `
              <div class="label-card">
                <div class="store-header">StockPilot Retail</div>
                <div class="item-name" title="${p.name}">${p.name}</div>
                <div class="mrp-row">
                  <span class="mrp-val">₹${Number(p.sellingPrice).toFixed(2)}</span>
                  <span class="sku-val">${p.sku}</span>
                </div>
                <div class="barcode-visual">|| | ||| || ||| | |||</div>
                <div class="barcode-digits">${p.barcode || p.sku}</div>
              </div>
            `).join("")}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  const handleDownloadCatalogTemplate = () => {
    const csvContent =
      "Name,SKU,Barcode,Category,CostPrice,SellingPrice,InitialStock,SupplierName\n" +
      '"Tata Tea Premium 500g","TEA-TAT-500","8901052002345","Beverages",140.00,175.00,50,"Tata Consumer Products"\n' +
      '"Parle-G Gold Biscuits 1kg","PAR-GLD-1K","8901719102031","Biscuits",65.00,80.00,75,"Parle Distributor"\n' +
      '"Fortune Sunlite Sunflower Oil 1L","OIL-FRT-01L","8906007281014","Edible Oils",125.00,150.00,40,"Adani Wilmar"\n' +
      '"Dettol Original Soap 125g","SOAP-DET-125","8901396328701","Personal Care",38.00,45.00,100,"Reckitt Benckiser"\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "stockpilot_catalog_starter_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadCatalogTemplate}
            className="text-xs font-mono px-3 py-2 border border-white/10 bg-[#16161d] hover:bg-[#1f1f28] rounded-lg text-[#97979d] hover:text-[#e8e6e3] transition-all flex items-center gap-1.5"
            title="Download Starter CSV Template"
          >
            <span>📥 Starter CSV</span>
          </button>
          <button
            onClick={handlePrintShelfLabels}
            className="text-xs font-mono px-3 py-2 border border-white/10 bg-[#16161d] hover:bg-[#1f1f28] rounded-lg text-[#e8e6e3] hover:border-[#d4a853]/40 transition-all flex items-center gap-1.5"
            title="Print Shelf Barcode & Price Tags"
          >
            <span>🖨️ Shelf Labels</span>
          </button>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-xs font-mono px-3 py-2 border border-white/8 bg-[#1a1a22] hover:bg-[#22222c] rounded-lg text-[#e8e6e3] transition-all"
          >
            Categories
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
                    Item Code / SKU {sortBy === "sku" && (sortOrder === "asc" ? "↑" : "↓")}
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
                    <td className="px-5 py-3.5 text-right relative actions-menu-container">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === product.id ? null : product.id);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            openActionId === product.id
                              ? "bg-[#20202e] border-[#d4a853]/60 text-[#e8e6e3]"
                              : "bg-[#16161f] border-white/10 text-[#97979d] hover:text-[#e8e6e3] hover:border-white/20"
                          }`}
                        >
                          <span>Actions</span>
                          <svg className={`w-3 h-3 transition-transform ${openActionId === product.id ? "rotate-180 text-[#d4a853]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {openActionId === product.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-[#181824] border border-white/10 rounded-lg shadow-2xl py-1 z-30 divide-y divide-white/5 animate-in fade-in duration-100">
                            <div className="py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setEditingProduct(product);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#e8e6e3] hover:bg-[#222232] hover:text-[#d4a853] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <span>✏️ Edit</span>
                              </button>
                              <Link
                                to={`/products/${product.id}`}
                                onClick={() => setOpenActionId(null)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#b4b4bc] hover:bg-[#222232] hover:text-[#e8e6e3] flex items-center gap-2 cursor-pointer transition-colors block"
                              >
                                <span>🔍 Details</span>
                              </Link>
                            </div>
                            <div className="py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  if (confirm(`Delete ${product.name}?`)) deleteProduct.mutate(product.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <span>🗑️ Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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