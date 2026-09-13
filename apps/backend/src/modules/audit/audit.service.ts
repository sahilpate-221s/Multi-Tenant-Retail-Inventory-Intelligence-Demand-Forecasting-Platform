import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";

export async function logAuditEvent(params: {
  storeId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // Audit logging failures must NEVER break the actual operation being
  // logged - losing an audit record is bad, but breaking a real user
  // action because logging failed would be worse. Fire-and-forget with
  // its own error handling.
  try {
    await db.insert(auditLogs).values({
      storeId: params.storeId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : undefined,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    console.error("Audit log write failed (non-fatal):", err);
  }
}