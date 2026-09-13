import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware";
import { postPreview, postCommit, getImports, getImportById } from "./imports.controller";

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

// Wraps any multer middleware call, converting its errors into our
// standard clean API error format instead of letting them fall through
// to Express's default handler (which leaks stack traces).
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

router.post("/preview", handleUploadErrors(upload.single("file")), postPreview);
router.post("/commit", handleUploadErrors(upload.single("file")), postCommit);
router.get("/", getImports);
router.get("/:id", getImportById);

export default router;