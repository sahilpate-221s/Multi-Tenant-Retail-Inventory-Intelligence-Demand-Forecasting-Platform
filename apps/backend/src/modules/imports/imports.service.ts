import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { imports, importErrors } from "../../db/schema";
import { csvImportQueue } from "../../queue/queues";

export async function createImportJob(storeId: string, fileName: string, fileBuffer: Buffer) {
  const [importRecord] = await db
    .insert(imports)
    .values({ storeId, fileName, status: "processing" })
    .returning();

  await csvImportQueue.add("process-csv", {
    importId: importRecord.id,
    storeId,
    fileBase64: fileBuffer.toString("base64"),
  });

  return importRecord;
}

export async function listImports(storeId: string) {
  return db.query.imports.findMany({
    where: eq(imports.storeId, storeId),
    orderBy: desc(imports.createdAt),
  });
}

export async function getImportDetail(storeId: string, importId: string) {
  const importRecord = await db.query.imports.findFirst({
    where: and(eq(imports.id, importId), eq(imports.storeId, storeId)),
  });
  if (!importRecord) return null;

  const errors = await db.query.importErrors.findMany({
    where: eq(importErrors.importId, importId),
    orderBy: importErrors.rowNumber,
  });

  return { ...importRecord, errors };
}