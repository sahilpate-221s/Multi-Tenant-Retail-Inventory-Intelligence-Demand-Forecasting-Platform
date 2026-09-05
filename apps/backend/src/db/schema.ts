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