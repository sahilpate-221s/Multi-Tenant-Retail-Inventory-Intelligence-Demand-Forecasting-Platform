import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware";
import { postPreview, postCommit, getImports, getImportById } from "./imports.controller";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.use(requireAuth);

router.post("/preview", upload.single("file"), postPreview);
router.post("/commit", upload.single("file"), postCommit);
router.get("/", getImports);
router.get("/:id", getImportById);

export default router;