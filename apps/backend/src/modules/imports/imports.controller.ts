import { Request, Response } from "express";
import { processCsv } from "./csvProcessor";
import { createImportJob, listImports, getImportDetail } from "./imports.service";

export async function postPreview(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file was uploaded." } });
  }

  if (req.file.mimetype !== "text/csv" && !req.file.originalname.endsWith(".csv")) {
    return res.status(400).json({ success: false, error: { code: "INVALID_FILE_TYPE", message: "Only CSV files are accepted." } });
  }

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — documented limit, spec section 26 calls out "huge files" as a case to handle
  if (req.file.size > MAX_SIZE_BYTES) {
    return res.status(400).json({ success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds the 5MB limit." } });
  }

  try {
    const result = await processCsv(req.auth!.storeId, req.file.buffer);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("CSV preview error:", err);
    return res.status(400).json({
      success: false,
      error: { code: "PARSE_ERROR", message: "Could not parse this file. Please check it's a valid CSV." },
    });
  }
}


export async function postCommit(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file was uploaded." } });
  }

  const importRecord = await createImportJob(req.auth!.storeId, req.file.originalname, req.file.buffer);

  return res.status(202).json({
    success: true,
    data: { importId: importRecord.id, status: importRecord.status },
  });
}

export async function getImports(req: Request, res: Response) {
  const data = await listImports(req.auth!.storeId);
  return res.status(200).json({ success: true, data });
}

export async function getImportById(req: Request, res: Response) {
  const detail = await getImportDetail(req.auth!.storeId, req.params.id as string);
  if (!detail) {
    return res.status(404).json({ success: false, error: { code: "IMPORT_NOT_FOUND", message: "Import not found." } });
  }
  return res.status(200).json({ success: true, data: detail });
}