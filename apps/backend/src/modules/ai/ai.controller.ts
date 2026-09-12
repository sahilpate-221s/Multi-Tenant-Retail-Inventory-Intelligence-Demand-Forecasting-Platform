import { Request, Response } from "express";
import { z } from "zod";
import { askAssistant } from "./ai.service";
import { getOrCreateConversation, getRecentMessages, clearConversation } from "./conversation.service";

const askSchema = z.object({ question: z.string().min(1).max(1000) });

export async function postAsk(req: Request, res: Response) {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }
  try {
    const result = await askAssistant(req.auth!.storeId, parsed.data.question);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "AI_UNAVAILABLE") {
      return res.status(503).json({ success: false, error: { code: "AI_UNAVAILABLE", message: "AI Assistant is not configured." } });
    }
    console.error("AI ask error:", err);
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  }
}


export async function getHistory(req: Request, res: Response) {
  const conversation = await getOrCreateConversation(req.auth!.storeId);
  const messages = await getRecentMessages(conversation.id);
  return res.status(200).json({
    success: true,
    data: messages.map((m) => ({
      role: m.role,
      content: m.content,
      toolsUsed: m.toolsUsed ? JSON.parse(m.toolsUsed) : undefined,
    })),
  });
}

export async function postClear(req: Request, res: Response) {
  await clearConversation(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { message: "Conversation cleared." } });
}