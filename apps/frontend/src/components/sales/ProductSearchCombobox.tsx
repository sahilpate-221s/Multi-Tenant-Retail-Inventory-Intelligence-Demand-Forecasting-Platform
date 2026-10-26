import { useState, useRef, useEffect } from "react";
import { useProducts } from "../../hooks/useProducts";
import type { Product } from "../../lib/types";

interface Props {
  selectedProductId: string;
  selectedProductName?: string;
  currency: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductSearchCombobox({
  selectedProductId,
  selectedProductName = "",
  currency,
  onSelect,
  placeholder = "Search product by name, SKU or barcode...",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: productsData, isLoading } = useProducts({
    search: query.trim() || undefined,
    page: 1,
    pageSize: 25,
    sortBy: "name",
    sortOrder: "asc",
    isActive: "true",
  });

  const productsList = productsData?.items || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (p: Product) => {
    onSelect(p);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 rounded-lg text-xs bg-[#14141a] text-[#f4f4f5] border border-white/10 hover:border-white/20 focus-within:border-[#d4a853] transition-colors cursor-pointer flex items-center justify-between"
      >
        {isOpen ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent outline-none text-[#f4f4f5] placeholder-[#71717a] text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={selectedProductId ? "text-[#f4f4f5] font-medium" : "text-[#71717a]"}>
            {selectedProductName || placeholder}
          </span>
        )}
        <span className="text-[10px] text-[#71717a] ml-2 shrink-0">▾</span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#141418] border border-white/15 rounded-xl shadow-2xl max-h-60 overflow-y-auto font-mono text-xs">
          {isLoading && (
            <div className="p-3 text-center text-[11px] text-[#97979d]">
              Searching catalog...
            </div>
          )}

          {!isLoading && productsList.length === 0 && (
            <div className="p-3 text-center text-[11px] text-[#97979d]">
              No products found matching "{query}".
            </div>
          )}

          {!isLoading && productsList.length > 0 && (
            <div className="divide-y divide-white/5">
              {productsList.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`p-2.5 hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected ? "bg-[#d4a853]/10 text-[#d4a853]" : ""
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-[#71717a] flex items-center gap-2 mt-0.5">
                        <span>SKU: {p.sku}</span>
                        {p.barcode && <span>• Barcode: {p.barcode}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#f5cf7b] tabular-nums">
                        {currency}
                        {p.sellingPrice}
                      </div>
                      {p.costPrice != null && (
                        <div className="text-[10px] text-[#71717a]">
                          Cost: {currency}
                          {p.costPrice}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductSearchCombobox;
