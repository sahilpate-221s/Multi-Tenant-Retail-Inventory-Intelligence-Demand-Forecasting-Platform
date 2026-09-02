import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redisConnection } from "../../queue/redisConnection";
import { db } from "../../db/client";
import { imports, importErrors, sales, saleItems } from "../../db/schema";
import { processCsv } from "./csvProcessor";

interface CsvImportJobData {
  importId: string;
  storeId: string;
  fileBase64: string;
}

export const importWorker = new Worker<CsvImportJobData>(
  "csv-import",
  async (job) => {
    const { importId, storeId, fileBase64 } = job.data;
    const fileBuffer = Buffer.from(fileBase64, "base64");

    const result = await processCsv(storeId, fileBuffer);

    // Write each valid row as its own sale + sale_item, in its own
    // transaction. One bad row's failure shouldn't roll back the
    // rows already committed successfully before it.
    let successCount = 0;
    const writeFailures: { rowNumber: number; rawData: Record<string, string>; errorMessage: string }[] = [];

    for (const row of result.validRows) {
      try {
        await db.transaction(async (tx) => {
          const [sale] = await tx
            .insert(sales)
            .values({
              storeId,
              importId,
              saleDate: row.saleDate,
              totalAmount: row.lineTotal.toString(),
            })
            .returning();

          await tx.insert(saleItems).values({
            saleId: sale.id,
            productId: row.productId,
            quantity: row.quantity,
            unitPrice: row.unitPrice.toString(),
            lineTotal: row.lineTotal.toString(),
          });
        });
        successCount++;
      } catch (err) {
        console.error(`[import-worker] Failed to write row ${row.rowNumber}:`, err);
        writeFailures.push({
          rowNumber: row.rowNumber,
          rawData: { productName: row.productName, quantity: String(row.quantity) },
          errorMessage: "Failed to save this row due to a database error.",
        });
      }
    }

    // Record every skipped row — both the ones that failed validation
    // AND any that failed to write — as queryable import_errors rows,
    // per spec section 26's "return useful row-level errors."
    const allErrorRows = [...result.errors, ...result.duplicates, ...writeFailures];
    if (allErrorRows.length > 0) {
      await db.insert(importErrors).values(
        allErrorRows.map((e) => ({
          importId,
          rowNumber: e.rowNumber,
          rawData: JSON.stringify(e.rawData),
          errorMessage: e.errorMessage,
        })),
      );
    }

    await db
      .update(imports)
      .set({
        status: "completed",
        totalRows: result.totalRows,
        successRows: successCount,
        errorRows: allErrorRows.length,
        completedAt: new Date(),
      })
      .where(eq(imports.id, importId));

    return { successCount, errorCount: allErrorRows.length };
  },
  { connection: redisConnection },
);

importWorker.on("failed", async (job, err) => {
  console.error(`[import-worker] Job ${job?.id} failed entirely:`, err.message);
  if (job?.data.importId) {
    await db.update(imports).set({ status: "failed" }).where(eq(imports.id, job.data.importId));
  }
});