export interface Category {
  id: string;
  storeId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  isActive?: "true" | "false";
  sortBy: "name" | "sku" | "sellingPrice" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  reliabilityNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  safetyStock: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  quantityChange: number;
  reason: string;
  note: string | null;
  createdAt: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportRowError {
  id: string;
  rowNumber: number;
  rawData: string;
  errorMessage: string;
}

export interface ImportDetail extends ImportRecord {
  errors: ImportRowError[];
}

export interface PreviewRow {
  rowNumber: number;
  saleDate: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PreviewErrorRow {
  rowNumber: number;
  rawData: Record<string, string>;
  errorMessage: string;
}

export interface PreviewResult {
  totalRows: number;
  validRows: PreviewRow[];
  errors: PreviewErrorRow[];
  duplicates: PreviewErrorRow[];
}


export interface DashboardData {
  periodDays: number;
  totalRevenue: number;
  unitsSold: number;
  inventoryValue: number;
  turnoverRatio: number | null;
  fastMovers: { productId: string; productName: string; unitsSold: number }[];
  slowMovers: { productId: string; productName: string; unitsSold: number; daysSinceLastSale: number | null }[];
  categoryPerformance: { categoryName: string; revenue: number }[];
}

export interface Recommendation {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  incomingStock: number;
  averageDailyDemand: string;
  leadTimeDays: number | null;
  safetyStock: number;
  reorderPoint: number | null;
  recommendedQuantity: number;
  daysUntilStockout: string | null;
  reasonCodes: string[];
  status: string;
  createdAt: string;
}

export interface DeadStockScore {
  id: string;
  productId: string;
  productName: string;
  score: number;
  daysSinceLastSale: number | null;
  currentStock: number;
  inventoryValue: string;
  averageDailyDemand: string;
  reasonCodes: string[];
  calculatedAt: string;
}