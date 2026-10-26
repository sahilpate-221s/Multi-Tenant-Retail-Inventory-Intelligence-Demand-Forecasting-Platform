import { Router } from "express";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import { getCategories, postCategory, patchCategory, removeCategory } from "./categories.controller";

const router = Router();

router.use(requireAuth); // every route below requires authentication

router.get("/", getCategories);
router.post("/", requireOwner, postCategory);
router.patch("/:id", requireOwner, patchCategory);
router.delete("/:id", requireOwner, removeCategory);

export default router;