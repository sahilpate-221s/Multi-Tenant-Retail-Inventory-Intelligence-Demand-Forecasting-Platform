import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { notifications } from "../../db/schema";

export type NotificationType =
  | "STOCKOUT_RISK"
  | "LOW_STOCK"
  | "DEAD_STOCK"
  | "DEMAND_ANOMALY"
  | "IMPORT_COMPLETED"
  | "IMPORT_FAILED"
  | "FORECAST_READY"
  | "REORDER_RECOMMENDATION";

export async function createNotification(
  storeId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedProductId?: string,
) {
  const [notification] = await db
    .insert(notifications)
    .values({ storeId, type, title, message, relatedProductId })
    .returning();
  return notification;
}

export async function listNotifications(storeId: string, unreadOnly: boolean = false) {
  const conditions = [eq(notifications.storeId, storeId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: desc(notifications.createdAt),
    limit: 50,
  });
}

export async function getUnreadCount(storeId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.storeId, storeId), eq(notifications.isRead, false)));
  return result.count;
}

export async function markAsRead(storeId: string, notificationId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.storeId, storeId)))
    .returning();
  return updated ?? null;
}

export async function markAllAsRead(storeId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.storeId, storeId));
}