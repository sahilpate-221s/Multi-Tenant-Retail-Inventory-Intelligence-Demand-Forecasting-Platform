import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * Executes a database operation within a PostgreSQL transaction with native Row-Level Security (RLS)
 * tenant context enabled. Even if an internal query omits `where: eq(table.storeId, ...)`,
 * the PostgreSQL database engine strictly enforces store isolation at the table level.
 */
export async function withTenantContext<T>(
  storeId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Switch to application role (NOSUPERUSER) and set transaction-local tenant context
    await tx.execute(sql`SET ROLE stockpilot_app`);
    await tx.execute(sql`SELECT set_config('app.current_store_id', ${storeId}, true)`);
    return callback(tx as any);
  });
}
