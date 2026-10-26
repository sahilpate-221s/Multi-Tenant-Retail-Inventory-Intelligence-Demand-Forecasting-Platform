// Perishables & Batch Expiry Storage Sentinel
// Tracks batch lots and expiration dates for perishable retail inventory (Dairy, FMCG, Bakery, Pharma).

export interface PerishableBatch {
  id: string;
  storeId: string;
  poId?: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  receivedAt: string;
}

const STORAGE_KEY_PREFIX = "sp_perishable_batches_";

function getStorageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId || "default"}`;
}

export function getPerishableBatches(storeId: string): PerishableBatch[] {
  try {
    const raw = localStorage.getItem(getStorageKey(storeId));
    if (!raw) {
      // Seed with sample batches for demo
      const today = new Date();
      const in3Days = new Date(today);
      in3Days.setDate(today.getDate() + 3);

      const in20Days = new Date(today);
      in20Days.setDate(today.getDate() + 20);

      const demoBatches: PerishableBatch[] = [
        {
          id: "batch-demo-1",
          storeId,
          productId: "prod-milk-01",
          productName: "Amul Taaza Homogenised Toned Milk 1L",
          sku: "DRY-AML-01",
          batchNumber: "LOT-AML-882",
          quantity: 24,
          expiryDate: in3Days.toISOString().split("T")[0],
          receivedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "batch-demo-2",
          storeId,
          productId: "prod-bread-02",
          productName: "Britannia Daily Fresh Bread 400g",
          sku: "BAK-BRT-01",
          batchNumber: "LOT-BRT-114",
          quantity: 15,
          expiryDate: in3Days.toISOString().split("T")[0],
          receivedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
          id: "batch-demo-3",
          storeId,
          productId: "prod-butter-03",
          productName: "Amul Salted Pasteurized Butter 500g",
          sku: "DRY-AML-500",
          batchNumber: "LOT-AML-991",
          quantity: 40,
          expiryDate: in20Days.toISOString().split("T")[0],
          receivedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ];
      localStorage.setItem(getStorageKey(storeId), JSON.stringify(demoBatches));
      return demoBatches;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePerishableBatches(storeId: string, batches: PerishableBatch[]) {
  try {
    localStorage.setItem(getStorageKey(storeId), JSON.stringify(batches));
    window.dispatchEvent(new Event("batches-updated"));
  } catch {
    // Silently ignore storage quota errors
  }
}

export function addPerishableBatch(
  storeId: string,
  batch: Omit<PerishableBatch, "id" | "receivedAt" | "storeId">
): PerishableBatch {
  const batches = getPerishableBatches(storeId);
  const newBatch: PerishableBatch = {
    ...batch,
    id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    storeId,
    receivedAt: new Date().toISOString(),
  };

  batches.unshift(newBatch);
  savePerishableBatches(storeId, batches);
  return newBatch;
}

export function getExpiringBatches(storeId: string, daysThreshold: number = 7): (PerishableBatch & { daysRemaining: number })[] {
  const batches = getPerishableBatches(storeId);
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return batches
    .map((b) => {
      const exp = new Date(b.expiryDate);
      const diffMs = exp.getTime() - todayDateOnly.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...b, daysRemaining };
    })
    .filter((b) => b.daysRemaining <= daysThreshold)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
