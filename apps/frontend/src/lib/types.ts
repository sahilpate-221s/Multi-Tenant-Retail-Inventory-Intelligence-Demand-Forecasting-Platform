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
export interface ModelScore {
  model: string;
  mae: number;
  rmse: number;
  wape: number | null;
}

export interface ForecastRun {
  id: string;
  productId: string;
  horizonDays: number;
  forecastedDailyDemand: string;
  forecastedTotalDemand: string;
  modelUsed: string;
  confidence: "low" | "medium" | "high";
  daysOfHistoryUsed: number;
  modelScoresSnapshot: string;
  generatedAt: string;
}

export interface StockoutPrediction {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  incomingStock: number;
  forecastedDailyDemand: string;
  demandSource: "forecast" | "historical_average";
  leadTimeDays: number | null;
  daysUntilStockout: string | null;
  riskLevel: "critical" | "high" | "moderate" | "low";
  calculatedAt: string;
}

export interface Anomaly {
  id: string;
  productId: string;
  productName: string;
  anomalyType: string;
  direction: "spike" | "drop";
  severity: "moderate" | "significant" | "extreme";
  observedValue: string;
  baselineMean: string;
  zScore: string | null;
  possibleCauses: string[];
  detectedAt: string;
}

export interface SimulationResult {
  id: string;
  productId: string;
  demandChangePercent: string;
  supplierDelayDays: number;
  budgetLimit: string | null;
  baselineCurrentStock: number;
  baselineAverageDailyDemand: string;
  baselineLeadTimeDays: number | null;
  simulatedAverageDailyDemand: string;
  simulatedLeadTimeDays: number | null;
  simulatedSafetyStock: number;
  simulatedReorderPoint: number | null;
  simulatedRecommendedQuantity: number;
  simulatedDaysUntilStockout: string | null;
  estimatedCost: string | null;
  budgetExceeded: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedProductId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

export interface Store {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStoreInput {
  name?: string;
  timezone?: string;
  currency?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface InventoryPolicySettings {
  defaultSafetyStockDays: number;
  lowStockAlertDays: number;
  autoReorderEnabled: boolean;
  blockNegativeInventory: boolean;
  notifyOnStockout: boolean;
  notifyOnAnomaly: boolean;
  notifyOnLeadTimeBreach: boolean;
  weeklyDigest: boolean;
  webhookUrl: string;
}


export interface AdvancedAnalytics {
  recommendationMetrics: {
    totalResolved: number;
    ordered: number;
    dismissed: number;
    pending: number;
    acceptanceRate: number | null;
  };
  capitalEfficiency: {
    totalInventoryValue: number;
    deadStockValue: number;
    healthyStockValue: number;
    efficiencyPercent: number | null;
  };
  categoryIntelligence: {
    categoryName: string;
    productCount: number;
    totalInventoryValue: number;
    averageDeadStockScore: number | null;
  }[];
  forecastPerformance: {
    scoreableForecastCount: number;
    totalForecastCount: number;
    meanAbsoluteError: number | null;
    wape: number | null;
    entries: {
      forecastId: string;
      productName: string;
      horizonDays: number;
      forecastedTotalDemand: number;
      actualTotalDemand: number;
      absoluteError: number;
    }[];
  };
}

// ── Bulk Restock CSV Upload ──

export interface RestockPreviewRow {
  rowNumber: number;
  productId: string;
  productName: string;
  csvProductName: string;
  sku: string;
  matchType: "exact_sku" | "exact_name" | "fuzzy_name";
  matchConfidence: number;
  quantity: number;
  currentStock: number;
  newStock: number;
}

export interface RestockPreviewErrorRow {
  rowNumber: number;
  rawData: Record<string, string>;
  errorMessage: string;
}

export interface RestockPreviewResult {
  totalRows: number;
  validRows: RestockPreviewRow[];
  warnings: RestockPreviewRow[];
  errors: RestockPreviewErrorRow[];
}

export interface RestockCommitResult {
  updatedCount: number;
  skippedCount: number;
  results: {
    productId: string;
    productName: string;
    previousStock: number;
    newStock: number;
  }[];
}

// ── Sales & Transactions ──

export interface SaleLineItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  returnedQuantity?: number;
}

export interface Sale {
  id: string;
  storeId: string;
  importId?: string | null;
  saleDate: string;
  totalAmount: number;
  createdAt: string;
  items: SaleLineItem[];
  totalUnits: number;
  returnStatus?: "none" | "partial" | "full";
}

export interface SalesMetrics {
  totalRevenue: number;
  totalUnits: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface SalesListResponse {
  items: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: SalesMetrics;
}

export interface CreateSaleInput {
  saleDate?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
}