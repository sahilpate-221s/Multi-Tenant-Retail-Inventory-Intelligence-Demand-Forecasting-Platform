import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { postAsk } from "./ai.controller";
import { postExplain } from "./explain.controller";
import { getHistory, postClear } from "./ai.controller";

const router = Router();
router.use(requireAuth);
router.use(requireOwner);
router.post("/ask", postAsk);
router.post("/explain/:type/:id", postExplain);
router.get("/history", getHistory);
router.post("/clear", postClear);

export default router;