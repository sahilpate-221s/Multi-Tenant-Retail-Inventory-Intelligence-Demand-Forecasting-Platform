import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth, requireOwner } from "../auth/auth.middleware";
import {
  getInventory,
  postAdjustment,
  getHistory,
  patchSettings,
  postBulkRestockPreview,
  postBulkRestockCommit,
} from "./inventory.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel"];
    const hasCSVExtension = file.originalname.toLowerCase().endsWith(".csv");
    if (allowedMimeTypes.includes(file.mimetype) || hasCSVExtension) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted."));
    }
  },
});

// Same pattern as imports.routes.ts — wraps multer errors into
// our standard clean API error format.
function handleUploadErrors(uploadMiddleware: ReturnType<typeof upload.single>) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            error: { code: "FILE_TOO_LARGE", message: "File exceeds the 5MB limit." },
          });
        }
        return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: (err as Error).message } });
      }
      if (err) {
        return res.status(400).json({ success: false, error: { code: "INVALID_FILE_TYPE", message: (err as Error).message } });
      }
      next();
    });
  };
}

const router = Router();
router.use(requireAuth);

router.get("/", getInventory);
router.post("/adjust", requireOwner, postAdjustment);
router.get("/:productId/history", getHistory);
router.patch("/:productId/settings", requireOwner, patchSettings);

// Bulk restock CSV endpoints
router.post("/bulk-restock/preview", requireOwner, handleUploadErrors(upload.single("file")), postBulkRestockPreview);
router.post("/bulk-restock/commit", requireOwner, handleUploadErrors(upload.single("file")), postBulkRestockCommit);

export default router;