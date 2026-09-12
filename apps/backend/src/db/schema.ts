import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  numeric,
  uniqueIndex,
  integer,
  date, text,
} from "drizzle-orm/pg-core";


export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    storeSkuUnique: uniqueIndex("products_store_id_sku_unique").on(
      table.storeId,
      table.sku,
    ),
  }),
);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  reliabilityNotes: varchar("reliability_notes", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    leadTimeDays: integer("lead_time_days").notNull(),
    moq: integer("moq").notNull().default(1),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    supplierProductUnique: uniqueIndex("supplier_products_supplier_product_unique").on(
      table.supplierId,
      table.productId,
    ),
  }),
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currentStock: integer("current_stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    safetyStock: integer("safety_stock").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    storeProductUnique: uniqueIndex("inventory_store_product_unique").on(
      table.storeId,
      table.productId,
    ),
  }),
);

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantityChange: integer("quantity_change").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // pending -> previewed -> processing -> completed | failed
  totalRows: integer("total_rows").notNull().default(0),
  successRows: integer("success_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const importErrors = pgTable("import_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  importId: uuid("import_id")
    .notNull()
    .references(() => imports.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  rawData: text("raw_data").notNull(),
  errorMessage: varchar("error_message", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  importId: uuid("import_id").references(() => imports.id, { onDelete: "set null" }),
  saleDate: date("sale_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  saleItemId: uuid("sale_item_id")
    .notNull()
    .references(() => saleItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  expectedArrivalDate: date("expected_arrival_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | received | cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  receivedAt: timestamp("received_at"),
});

export const reorderRecommendations = pgTable("reorder_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  currentStock: integer("current_stock").notNull(),
  incomingStock: integer("incoming_stock").notNull(),
  averageDailyDemand: numeric("average_daily_demand", { precision: 10, scale: 3 }).notNull(),
  leadTimeDays: integer("lead_time_days"),
  safetyStock: integer("safety_stock").notNull(),
  reorderPoint: integer("reorder_point"),
  recommendedQuantity: integer("recommended_quantity").notNull(),
  daysUntilStockout: numeric("days_until_stockout", { precision: 10, scale: 1 }),
  reasonCodes: text("reason_codes").notNull(), // JSON array, stored as text
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | ordered | dismissed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const deadStockScores = pgTable("dead_stock_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  daysSinceLastSale: integer("days_since_last_sale"),
  currentStock: integer("current_stock").notNull(),
  inventoryValue: numeric("inventory_value", { precision: 12, scale: 2 }).notNull(),
  averageDailyDemand: numeric("average_daily_demand", { precision: 10, scale: 3 }).notNull(),
  reasonCodes: text("reason_codes").notNull(),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

export const forecastRuns = pgTable("forecast_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  horizonDays: integer("horizon_days").notNull(), // 7 or 30
  forecastedDailyDemand: numeric("forecasted_daily_demand", { precision: 10, scale: 3 }).notNull(),
  forecastedTotalDemand: numeric("forecasted_total_demand", { precision: 10, scale: 3 }).notNull(),
  modelUsed: varchar("model_used", { length: 100 }).notNull(),
  confidence: varchar("confidence", { length: 20 }).notNull(), // low | medium | high
  daysOfHistoryUsed: integer("days_of_history_used").notNull(),
  modelScoresSnapshot: text("model_scores_snapshot").notNull(), // JSON, for auditability
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const stockoutPredictions = pgTable("stockout_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  currentStock: integer("current_stock").notNull(),
  incomingStock: integer("incoming_stock").notNull(),
  forecastedDailyDemand: numeric("forecasted_daily_demand", { precision: 10, scale: 3 }).notNull(),
  demandSource: varchar("demand_source", { length: 30 }).notNull(), // "forecast" | "historical_average"
  leadTimeDays: integer("lead_time_days"),
  daysUntilStockout: numeric("days_until_stockout", { precision: 10, scale: 1 }),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(), // critical | high | moderate | low
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

export const anomalies = pgTable("anomalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  anomalyType: varchar("anomaly_type", { length: 30 }).notNull(), // "demand" | "return"
  direction: varchar("direction", { length: 10 }).notNull(), // spike | drop
  severity: varchar("severity", { length: 20 }).notNull(),
  observedValue: numeric("observed_value", { precision: 10, scale: 3 }).notNull(),
  baselineMean: numeric("baseline_mean", { precision: 10, scale: 3 }).notNull(),
  zScore: numeric("z_score", { precision: 10, scale: 3 }),
  possibleCauses: text("possible_causes").notNull(), // JSON array
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const simulations = pgTable("simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  // Inputs — the hypothetical scenario, stored so a run is reproducible/auditable
  demandChangePercent: numeric("demand_change_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  supplierDelayDays: integer("supplier_delay_days").notNull().default(0),
  budgetLimit: numeric("budget_limit", { precision: 12, scale: 2 }),
  // Baseline snapshot — the real data this simulation was run against,
  // so the result is auditable even if real data later changes
  baselineCurrentStock: integer("baseline_current_stock").notNull(),
  baselineAverageDailyDemand: numeric("baseline_average_daily_demand", { precision: 10, scale: 3 }).notNull(),
  baselineLeadTimeDays: integer("baseline_lead_time_days"),
  // Outputs
  simulatedAverageDailyDemand: numeric("simulated_average_daily_demand", { precision: 10, scale: 3 }).notNull(),
  simulatedLeadTimeDays: integer("simulated_lead_time_days"),
  simulatedSafetyStock: integer("simulated_safety_stock").notNull(),
  simulatedReorderPoint: integer("simulated_reorder_point"),
  simulatedRecommendedQuantity: integer("simulated_recommended_quantity").notNull(),
  simulatedDaysUntilStockout: numeric("simulated_days_until_stockout", { precision: 10, scale: 1 }),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  budgetExceeded: boolean("budget_exceeded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  // STOCKOUT_RISK | LOW_STOCK | DEAD_STOCK | DEMAND_ANOMALY |
  // IMPORT_COMPLETED | IMPORT_FAILED | FORECAST_READY | REORDER_RECOMMENDATION
  title: varchar("title", { length: 255 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  relatedProductId: uuid("related_product_id").references(() => products.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  toolsUsed: text("tools_used"), // JSON array, nullable
  createdAt: timestamp("created_at").notNull().defaultNow(),
});