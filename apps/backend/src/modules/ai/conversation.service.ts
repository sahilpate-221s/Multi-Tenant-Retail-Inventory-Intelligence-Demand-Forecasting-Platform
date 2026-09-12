import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { conversations, conversationMessages } from "../../db/schema";

const MAX_HISTORY_MESSAGES = 10; // recent turns only - keeps context bounded and cost-reasonable

export async function getOrCreateConversation(storeId: string) {
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.storeId, storeId),
    orderBy: desc(conversations.updatedAt),
  });
  if (existing) return existing;

  const [created] = await db.insert(conversations).values({ storeId }).returning();
  return created;
}

export async function getRecentMessages(conversationId: string) {
  const messages = await db.query.conversationMessages.findMany({
    where: eq(conversationMessages.conversationId, conversationId),
    orderBy: desc(conversationMessages.createdAt),
    limit: MAX_HISTORY_MESSAGES,
  });
  return messages.reverse(); // chronological order for sending to the model
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  toolsUsed?: string[],
) {
  await db.insert(conversationMessages).values({
    conversationId,
    role,
    content,
    toolsUsed: toolsUsed ? JSON.stringify(toolsUsed) : undefined,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
}

export async function clearConversation(storeId: string) {
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.storeId, storeId) });
  if (conversation) {
    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, conversation.id));
  }
}