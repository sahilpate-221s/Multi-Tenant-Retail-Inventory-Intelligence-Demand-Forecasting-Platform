import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postAsk } from "./ai.controller";
import { postExplain } from "./explain.controller";
import { getHistory, postClear } from "./ai.controller";

const router = Router();
router.use(requireAuth);
router.post("/ask", postAsk);
router.post("/explain/:type/:id", postExplain);
router.get("/history", getHistory);
router.post("/clear", postClear);

export default router;