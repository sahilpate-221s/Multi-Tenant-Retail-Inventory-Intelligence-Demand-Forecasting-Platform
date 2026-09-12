import { Request, Response } from "express";
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from "./notifications.service";

export async function getNotifications(req: Request, res: Response) {
  const unreadOnly = req.query.unreadOnly === "true";
  const data = await listNotifications(req.auth!.storeId, unreadOnly);
  return res.status(200).json({ success: true, data });
}

export async function getUnread(req: Request, res: Response) {
  const count = await getUnreadCount(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { count } });
}

export async function patchRead(req: Request, res: Response) {
  const updated = await markAsRead(req.auth!.storeId, req.params.id as string);
  if (!updated) {
    return res.status(404).json({ success: false, error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found." } });
  }
  return res.status(200).json({ success: true, data: updated });
}

export async function postMarkAllRead(req: Request, res: Response) {
  await markAllAsRead(req.auth!.storeId);
  return res.status(200).json({ success: true, data: { message: "All notifications marked as read." } });
}