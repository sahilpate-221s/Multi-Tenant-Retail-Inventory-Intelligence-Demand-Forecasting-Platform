import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, notifications } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { listNotifications, markAsRead } from "./notifications.service";

let storeAId: string;
let storeBId: string;
let notificationAId: string;

beforeAll(async () => {
  const [storeA] = await db.insert(stores).values({ name: "CT Test Store A - Notif" }).returning();
  const [storeB] = await db.insert(stores).values({ name: "CT Test Store B - Notif" }).returning();
  storeAId = storeA.id;
  storeBId = storeB.id;
  await db.insert(users).values({
    storeId: storeAId,
    email: `notif-a-${Date.now()}@crosstenanttest.local`,
    passwordHash: await hashPassword("irrelevant"),
  });

  const [notif] = await db
    .insert(notifications)
    .values({ storeId: storeAId, type: "IMPORT_COMPLETED", title: "Store A Secret Notification", message: "test" })
    .returning();
  notificationAId = notif.id;
});

afterAll(async () => {
  await db.delete(stores).where(eq(stores.id, storeAId));
  await db.delete(stores).where(eq(stores.id, storeBId));
});

describe("Cross-tenant isolation: notifications", () => {
  it("Store B's notification list never includes Store A's notification", async () => {
    const result = await listNotifications(storeBId);
    expect(result.find((n) => n.id === notificationAId)).toBeUndefined();
  });

  it("Store B cannot mark Store A's notification as read", async () => {
    const result = await markAsRead(storeBId, notificationAId);
    expect(result).toBeNull();
  });
});
