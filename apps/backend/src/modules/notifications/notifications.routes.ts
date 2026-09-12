import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getNotifications, getUnread, patchRead, postMarkAllRead } from "./notifications.controller";

const router = Router();
router.use(requireAuth);

router.get("/", getNotifications);
router.get("/unread-count", getUnread);
router.patch("/:id/read", patchRead);
router.post("/mark-all-read", postMarkAllRead);

export default router;