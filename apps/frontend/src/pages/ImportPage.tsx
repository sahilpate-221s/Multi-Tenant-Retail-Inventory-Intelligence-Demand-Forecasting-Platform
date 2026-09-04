import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { usePreviewCsv, useCommitCsv, useImports } from "../hooks/useImports";
import type { PreviewResult } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";

function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committedImportId, setCommittedImportId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewCsv = usePreviewCsv();
  const commitCsv = useCommitCsv();
  const { data: imports, isLoading: importsLoading } = useImports();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(null);
    setError(null);
    setCommittedImportId(null);
  }

  async function handlePreview() {
    if (!file) return;
    setError(null);
    try {
      const result = await previewCsv.mutateAsync(file);
      setPreview(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleCommit() {
    if (!file) return;
    setError(null);
    try {
      const result = await commitCsv.mutateAsync(file);
      setCommittedImportId(result.importId);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-800">Import Sales</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload a CSV with columns: date, product, quantity, unitPrice (optional).
      </p>

      <div className="mt-4 border border-slate-200 rounded-lg bg-white p-5">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="text-sm" />

        {file && !preview && (
          <button
            onClick={handlePreview}
            disabled={previewCsv.isPending}
            className="mt-3 bg-slate-900 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
          >
            {previewCsv.isPending ? "Analyzing..." : "Preview Import"}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}

        {committedImportId && (
          <div className="mt-3 text-sm bg-status-success-bg text-status-success rounded-md px-3 py-2">
            Import started —{" "}
            <Link to={`/import/${committedImportId}`} className="underline font-medium">
              view progress
            </Link>
          </div>
        )}

        {preview && (
          <div className="mt-4">
            <div className="flex gap-4 text-sm">
              <span className="text-status-success">{preview.validRows.length} valid</span>
              <span className="text-status-danger">{preview.errors.length} errors</span>
              <span className="text-status-warning">{preview.duplicates.length} duplicates</span>
              <span className="text-slate-400">{preview.totalRows} total rows</span>
            </div>

            {preview.validRows.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Ready to import</p>
                <table className="w-full text-sm border border-slate-100 rounded">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr><th className="px-2 py-1">Row</th><th className="px-2 py-1">Date</th><th className="px-2 py-1">Product</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1">Total</th></tr>
                  </thead>
                  <tbody>
                    {preview.validRows.slice(0, 10).map((r) => (
                      <tr key={r.rowNumber} className="border-t border-slate-100">
                        <td className="px-2 py-1 text-slate-400">{r.rowNumber}</td>
                        <td className="px-2 py-1">{r.saleDate}</td>
                        <td className="px-2 py-1">{r.productName}</td>
                        <td className="px-2 py-1">{r.quantity}</td>
                        <td className="px-2 py-1">₹{r.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.validRows.length > 10 && (
                  <p className="text-xs text-slate-400 mt-1">+ {preview.validRows.length - 10} more rows</p>
                )}
              </div>
            )}

            {(preview.errors.length > 0 || preview.duplicates.length > 0) && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Problems found</p>
                <table className="w-full text-sm border border-slate-100 rounded">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr><th className="px-2 py-1">Row</th><th className="px-2 py-1">Issue</th></tr>
                  </thead>
                  <tbody>
                    {[...preview.errors, ...preview.duplicates].map((e) => (
                      <tr key={e.rowNumber} className="border-t border-slate-100">
                        <td className="px-2 py-1 text-slate-400">{e.rowNumber}</td>
                        <td className="px-2 py-1 text-status-danger">{e.errorMessage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.validRows.length > 0 && (
              <button
                onClick={handleCommit}
                disabled={commitCsv.isPending}
                className="mt-4 bg-slate-900 text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
              >
                {commitCsv.isPending ? "Starting import..." : `Import ${preview.validRows.length} valid rows`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-slate-700 mb-2">Import History</h2>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          {importsLoading && <LoadingState message="Loading history..." />}
          {imports?.length === 0 && <EmptyState title="No imports yet" />}
          {imports && imports.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr><th className="px-4 py-2">File</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Rows</th><th className="px-4 py-2">Date</th></tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link to={`/import/${imp.id}`} className="text-slate-800 hover:underline">{imp.fileName}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        imp.status === "completed" ? "bg-status-success-bg text-status-success" :
                        imp.status === "failed" ? "bg-status-danger-bg text-status-danger" :
                        "bg-status-info-bg text-status-info"
                      }`}>
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{imp.successRows}/{imp.totalRows}</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(imp.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportPage;