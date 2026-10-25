export interface BarcodeProductInfo {
  code: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
  suggestedSku?: string;
}

/**
 * Fast online lookup for real-world retail barcodes
 * Uses Open Food Facts & Open Products Facts (global, free, no API key needed)
 */
export async function lookupBarcodeInfo(rawCode: string): Promise<BarcodeProductInfo | null> {
  const code = rawCode.trim().replace(/[-\s]/g, "");
  if (!code || code.length < 4) return null;

  // 1. Try Open Food Facts (Groceries, food, snacks, drinks, FMCG)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 1 && data.product) {
        const p = data.product;
        const brand = (p.brands || "").split(",")[0]?.trim();
        const rawName = p.product_name || p.product_name_en || p.generic_name || "";
        const quantity = p.quantity || "";

        let fullName = rawName;
        if (brand && fullName && !fullName.toLowerCase().includes(brand.toLowerCase())) {
          fullName = `${brand} ${fullName}`;
        }
        if (quantity && fullName && !fullName.toLowerCase().includes(quantity.toLowerCase())) {
          fullName = `${fullName} (${quantity})`;
        }

        if (fullName) {
          return {
            code,
            name: fullName.trim(),
            brand: brand || undefined,
            category: p.categories?.split(",")[0]?.trim() || undefined,
            imageUrl: p.image_url || p.image_front_url || undefined,
            quantity: quantity || undefined,
            suggestedSku: generateSku(brand || fullName, code),
          };
        }
      }
    }
  } catch {
    // Timeout or network error, fallback to Open Products Facts
  }

  // 2. Try Open Products Facts (Cosmetics, electronics, household, general goods)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(code)}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 1 && data.product) {
        const p = data.product;
        const brand = (p.brands || "").split(",")[0]?.trim();
        const rawName = p.product_name || p.product_name_en || "";
        let fullName = rawName;
        if (brand && fullName && !fullName.toLowerCase().includes(brand.toLowerCase())) {
          fullName = `${brand} ${fullName}`;
        }
        if (fullName) {
          return {
            code,
            name: fullName.trim(),
            brand: brand || undefined,
            category: p.categories?.split(",")[0]?.trim() || undefined,
            imageUrl: p.image_url || undefined,
            suggestedSku: generateSku(brand || fullName, code),
          };
        }
      }
    }
  } catch {
    // Ignore error
  }

  return null;
}

function generateSku(seed: string, code: string): string {
  const cleanSeed = seed
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const lastFour = code.slice(-4);
  return `${cleanSeed || "SKU"}-${lastFour}`;
}
