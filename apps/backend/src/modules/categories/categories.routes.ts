import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { getCategories, postCategory, patchCategory, removeCategory } from "./categories.controller";

const router = Router();

router.use(requireAuth); // every route below requires authentication

router.get("/", getCategories);
router.post("/", postCategory);
router.patch("/:id", patchCategory);
router.delete("/:id", removeCategory);

export default router;