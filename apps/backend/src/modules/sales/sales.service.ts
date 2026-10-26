import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { sales, saleItems, products, returns, inventory, inventoryMovements } from "../../db/schema";
import type { ListSalesQuery, CreateSaleInput } from "./sales.schema";
import { logAuditEvent } from "../audit/audit.service";

export class SalesError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function listSales(storeId: string, query: ListSalesQuery) {
  const conditions = [eq(sales.storeId, storeId)];

  if (query.startDate) {
    conditions.push(gte(sales.saleDate, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(sales.saleDate, query.endDate));
  }

  // Filter by specific product
  if (query.productId) {
    const matchingSales = db
      .select({ saleId: saleItems.saleId })
      .from(saleItems)
      .where(eq(saleItems.productId, query.productId));
    conditions.push(inArray(sales.id, matchingSales));
  }

  // Search by product name, SKU, or order ID
  if (query.search && query.search.trim()) {
    const searchPattern = `%${query.search.trim()}%`;
    const matchingByProduct = db
      .select({ saleId: saleItems.saleId })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(products.storeId, storeId),
          sql`(${products.name} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern})`
        )
      );

    // If query is a valid UUID prefix or exact ID
    conditions.push(
      sql`(${inArray(sales.id, matchingByProduct)} OR ${sales.id}::text ILIKE ${searchPattern})`
    );
  }

  const whereClause = and(...conditions);

  // 1. Total matching count
  const [countResult] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(sales)
    .where(whereClause);

  const total = countResult?.total ?? 0;
  const offset = (query.page - 1) * query.limit;

  // 2. Fetch paginated sales
  const salesRows = await db
    .select({
      id: sales.id,
      storeId: sales.storeId,
      importId: sales.importId,
      saleDate: sales.saleDate,
      totalAmount: sales.totalAmount,
      cgstAmount: sales.cgstAmount,
      sgstAmount: sales.sgstAmount,
      totalTax: sales.totalTax,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(whereClause)
    .orderBy(desc(sales.saleDate), desc(sales.createdAt))
    .limit(query.limit)
    .offset(offset);

  // 3. For the returned sales, load items + product details + returns
  const saleIds = salesRows.map((s) => s.id);
  const itemsBySaleId: Record<string, any[]> = {};

  if (saleIds.length > 0) {
    const rawItems = await db
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        lineTotal: saleItems.lineTotal,
        hsnCode: saleItems.hsnCode,
        gstRate: saleItems.gstRate,
        taxAmount: saleItems.taxAmount,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(inArray(saleItems.saleId, saleIds));

    // Get returns for these sale items
    const saleItemIds = rawItems.map((item) => item.id);
    const returnSums: Record<string, number> = {};

    if (saleItemIds.length > 0) {
      const returnRows = await db
        .select({
          saleItemId: returns.saleItemId,
          returnedQty: sql<number>`COALESCE(SUM(${returns.quantity}), 0)::int`,
        })
        .from(returns)
        .where(inArray(returns.saleItemId, saleItemIds))
        .groupBy(returns.saleItemId);

      for (const r of returnRows) {
        returnSums[r.saleItemId] = Number(r.returnedQty);
      }
    }

    for (const item of rawItems) {
      if (!itemsBySaleId[item.saleId]) {
        itemsBySaleId[item.saleId] = [];
      }
      itemsBySaleId[item.saleId].push({
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        hsnCode: item.hsnCode ?? null,
        gstRate: item.gstRate ? Number(item.gstRate) : 0,
        taxAmount: item.taxAmount ? Number(item.taxAmount) : 0,
        returnedQuantity: returnSums[item.id] || 0,
      });
    }
  }

  // 4. Compute aggregate metrics for this filter window
  const [revenueMetric] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      totalOrders: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(whereClause);

  const [unitsMetric] = await db
    .select({
      totalUnits: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)::int`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(whereClause);

  const totalRevenue = Number(revenueMetric?.totalRevenue ?? 0);
  const totalOrders = Number(revenueMetric?.totalOrders ?? 0);
  const totalUnits = Number(unitsMetric?.totalUnits ?? 0);
  const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  // Format final sales items
  const items = salesRows.map((s) => {
    const saleLineItems = itemsBySaleId[s.id] || [];
    const units = saleLineItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const returnedUnits = saleLineItems.reduce((acc, curr) => acc + (curr.returnedQuantity || 0), 0);

    let returnStatus: "none" | "partial" | "full" = "none";
    if (returnedUnits > 0) {
      returnStatus = returnedUnits >= units ? "full" : "partial";
    }

    return {
      id: s.id,
      storeId: s.storeId,
      importId: s.importId,
      saleDate: s.saleDate,
      totalAmount: Number(s.totalAmount),
      cgstAmount: Number(s.cgstAmount || 0),
      sgstAmount: Number(s.sgstAmount || 0),
      totalTax: Number(s.totalTax || 0),
      createdAt: s.createdAt,
      totalUnits: units,
      returnStatus,
      items: saleLineItems,
    };
  });

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    metrics: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalUnits,
      totalOrders,
      avgOrderValue,
    },
  };
}

export async function getSaleById(storeId: string, saleId: string) {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.storeId, storeId)))
    .limit(1);

  if (!sale) {
    return null;
  }

  const rawItems = await db
    .select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      lineTotal: saleItems.lineTotal,
      hsnCode: saleItems.hsnCode,
      gstRate: saleItems.gstRate,
      taxAmount: saleItems.taxAmount,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, sale.id));

  // Get returns for these sale items
  const itemIds = rawItems.map((i) => i.id);
  const returnRows =
    itemIds.length > 0
      ? await db
          .select({
            id: returns.id,
            saleItemId: returns.saleItemId,
            quantity: returns.quantity,
            reason: returns.reason,
            createdAt: returns.createdAt,
          })
          .from(returns)
          .where(inArray(returns.saleItemId, itemIds))
      : [];

  const items = rawItems.map((item) => {
    const itemReturns = returnRows.filter((r) => r.saleItemId === item.id);
    const returnedQty = itemReturns.reduce((sum, r) => sum + r.quantity, 0);

    return {
      id: item.id,
      saleId: item.saleId,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      hsnCode: item.hsnCode ?? null,
      gstRate: item.gstRate ? Number(item.gstRate) : 0,
      taxAmount: item.taxAmount ? Number(item.taxAmount) : 0,
      returnedQuantity: returnedQty,
      returns: itemReturns,
    };
  });

  const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const returnedUnits = items.reduce((acc, curr) => acc + curr.returnedQuantity, 0);

  let returnStatus: "none" | "partial" | "full" = "none";
  if (returnedUnits > 0) {
    returnStatus = returnedUnits >= totalUnits ? "full" : "partial";
  }

  return {
    id: sale.id,
    storeId: sale.storeId,
    importId: sale.importId,
    saleDate: sale.saleDate,
    totalAmount: Number(sale.totalAmount),
    cgstAmount: Number(sale.cgstAmount || 0),
    sgstAmount: Number(sale.sgstAmount || 0),
    totalTax: Number(sale.totalTax || 0),
    createdAt: sale.createdAt,
    totalUnits,
    returnStatus,
    items,
  };
}

export async function createSale(storeId: string, userId: string, input: CreateSaleInput) {
  const saleDate = input.saleDate || new Date().toISOString().slice(0, 10);

  // Validate that all products exist and belong to this store
  const productIds = input.items.map((i) => i.productId);
  const storeProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      hsnCode: products.hsnCode,
      gstRate: products.gstRate,
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, productIds)));

  if (storeProducts.length !== productIds.length) {
    throw new SalesError("One or more selected products do not belong to this store.", "INVALID_PRODUCT");
  }

  const productMap = new Map(storeProducts.map((p) => [p.id, p]));

  // Calculate totals and MRP-inclusive Indian GST
  let grandTotal = 0;
  let totalTaxSum = 0;

  const processedItems = input.items.map((item) => {
    const prod = productMap.get(item.productId);
    const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const gstRate = prod?.gstRate ? Number(prod.gstRate) : 0;
    const hsnCode = prod?.hsnCode ?? null;

    // Inclusive GST: Taxable Value = Line Total / (1 + Rate / 100)
    let taxAmount = 0;
    if (gstRate > 0) {
      const taxableValue = lineTotal / (1 + gstRate / 100);
      taxAmount = Math.round((lineTotal - taxableValue) * 100) / 100;
    }

    grandTotal += lineTotal;
    totalTaxSum += taxAmount;

    return {
      ...item,
      lineTotal,
      hsnCode,
      gstRate,
      taxAmount,
    };
  });

  grandTotal = Math.round(grandTotal * 100) / 100;
  totalTaxSum = Math.round(totalTaxSum * 100) / 100;
  const cgstAmount = Math.round((totalTaxSum / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTaxSum - cgstAmount) * 100) / 100;

  return db.transaction(async (tx) => {
    // 1. Create sale record
    const [sale] = await tx
      .insert(sales)
      .values({
        storeId,
        saleDate,
        totalAmount: grandTotal.toString(),
        cgstAmount: cgstAmount.toString(),
        sgstAmount: sgstAmount.toString(),
        totalTax: totalTaxSum.toString(),
      })
      .returning();

    // 2. Insert sale items & deduct inventory
    for (const item of processedItems) {
      await tx.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
        hsnCode: item.hsnCode,
        gstRate: item.gstRate.toString(),
        taxAmount: item.taxAmount.toString(),
      });

      // Atomic inventory deduction with race condition prevention (SQL atomic decrement)
      const [deducted] = await tx
        .update(inventory)
        .set({
          currentStock: sql`${inventory.currentStock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.storeId, storeId),
            eq(inventory.productId, item.productId),
            sql`${inventory.currentStock} >= ${item.quantity}`
          )
        )
        .returning();

      if (!deducted) {
        const [existing] = await tx
          .select({ currentStock: inventory.currentStock })
          .from(inventory)
          .where(and(eq(inventory.storeId, storeId), eq(inventory.productId, item.productId)))
          .limit(1);

        const available = existing?.currentStock ?? 0;
        const prodName = productMap.get(item.productId)?.name || "Item";
        throw new SalesError(
          `Stock out! "${prodName}" kisi aur counter par bik gaya ya stock kam hai (Available: ${available}, Requested: ${item.quantity}).`,
          "INSUFFICIENT_STOCK",
          409
        );
      }

      // Record movement ledger
      await tx.insert(inventoryMovements).values({
        storeId,
        productId: item.productId,
        quantityChange: -item.quantity,
        reason: "SALE",
        note: `POS sale transaction #${sale.id.slice(0, 8)}`,
      });
    }

    // 3. Log audit event
    await logAuditEvent({
      storeId,
      userId,
      action: "SALE_CREATED",
      entityType: "sale",
      entityId: sale.id,
      details: {
        totalAmount: grandTotal,
        cgstAmount,
        sgstAmount,
        totalTax: totalTaxSum,
        itemsCount: input.items.length,
        saleDate,
      },
    });

    return {
      id: sale.id,
      storeId: sale.storeId,
      saleDate: sale.saleDate,
      totalAmount: grandTotal,
      cgstAmount,
      sgstAmount,
      totalTax: totalTaxSum,
      itemsCount: input.items.length,
      createdAt: sale.createdAt,
    };
  });
}
