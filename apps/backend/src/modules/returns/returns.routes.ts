import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { postReturn, getProductReturns } from "./returns.controller";

const router = Router();
router.use(requireAuth);
router.post("/", postReturn);
router.get("/product/:productId", getProductReturns);

export default router;  