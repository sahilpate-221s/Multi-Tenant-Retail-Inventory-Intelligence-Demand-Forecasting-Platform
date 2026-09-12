import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { usePreviewCsv, useCommitCsv, useImportList } from "../hooks/useImports";
import type { CsvPreviewResult } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import LoadingState from "../components/states/LoadingState";
import EmptyState from "../components/states/EmptyState";

function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committedImportId, setCommittedImportId] = useState<string | null>(null);

  const previewCsv = usePreviewCsv();
  const commitCsv = useCommitCsv();
  const { data: imports, isLoading: importsLoading } = useImportList();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
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
      setError(err instanceof ApiError ? err.message : "Failed to parse CSV file.");
    }
  }

  async function handleCommit() {
    if (!file) return;
    setError(null);
    try {
      const result = await commitCsv.mutateAsync(file);
      setCommittedImportId(result.importId);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div>
        <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
          INGESTION PIPELINE
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
          Bulk Sales & Telemetry Ingestion
        </h1>
        <p className="mt-1 text-xs text-[#97979d]">
          Upload standard ERP ledger export CSV (columns: date, product, quantity, unitPrice).
        </p>
      </div>

      {/* File Upload Box */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 p-6 shadow-2xl backdrop-blur-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="text-xs text-[#97979d] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-semibold file:bg-[#d4a853] file:text-[#0c0c0e] hover:file:bg-[#e8be66] file:cursor-pointer cursor-pointer"
        />

        {file && !preview && (
          <button
            onClick={handlePreview}
            disabled={previewCsv.isPending}
            className="mt-4 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {previewCsv.isPending ? "Validating Ledger CSV..." : "Preview Import Stream →"}
          </button>
        )}

        {error && <p className="mt-3 text-xs text-[#d45a4a] p-2 rounded bg-[#d45a4a]/10 border border-[#d45a4a]/25">{error}</p>}

        {committedImportId && (
          <div className="mt-4 text-xs bg-[#4aba7a]/15 text-[#4aba7a] border border-[#4aba7a]/30 rounded-lg p-3">
            Ingestion queued in background worker —{" "}
            <Link to={`/import/${committedImportId}`} className="underline font-bold">
              View live worker stream →
            </Link>
          </div>
        )}

        {preview && (
          <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="text-[#4aba7a] font-bold">{preview.validRows.length} VALID ROWS</span>
              <span className="text-[#d45a4a] font-bold">{preview.errors.length} FORMAT ERRORS</span>
              <span className="text-[#d4a853] font-bold">{preview.duplicates.length} DUPLICATES</span>
              <span className="text-[#97979d]">{preview.totalRows} TOTAL ROWS</span>
            </div>

            {preview.validRows.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase text-[#97979d] font-bold mb-2">VALID ROWS SAMPLE</p>
                <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#16161d] text-[#97979d] uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {preview.validRows.slice(0, 5).map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[#181822]/60 text-[#e8e6e3]">
                          <td className="px-3 py-2 text-[#5c5c64]">{r.rowNumber}</td>
                          <td className="px-3 py-2 text-[#97979d]">{r.saleDate}</td>
                          <td className="px-3 py-2 font-semibold">{r.productName}</td>
                          <td className="px-3 py-2 text-[#d4a853]">{r.quantity}</td>
                          <td className="px-3 py-2">₹{r.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.validRows.length > 0 && (
              <button
                onClick={handleCommit}
                disabled={commitCsv.isPending}
                className="mt-5 bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] text-xs font-semibold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_20px_rgba(212,168,83,0.25)] active:scale-95 disabled:opacity-50"
              >
                {commitCsv.isPending ? "Spawning Ingestion Worker..." : `Execute Ingestion (${preview.validRows.length} Rows)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-8">
        <h2 className="text-xs uppercase tracking-wider font-bold text-[#e8e6e3] mb-3">
          Historical Ingestion Batches
        </h2>
        <div className="border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 overflow-hidden shadow-xl">
          {importsLoading && <LoadingState message="Loading ingestion batches..." />}
          {imports?.length === 0 && <EmptyState title="No prior imports recorded" />}
          {imports && imports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#16161d] text-[#97979d] border-b border-[rgba(255,255,255,0.08)] uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">File Signature</th>
                    <th className="px-5 py-3">Ingestion Status</th>
                    <th className="px-5 py-3">Committed Rows</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-[#181822]/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/import/${imp.id}`} className="font-semibold text-[#e8e6e3] hover:text-[#d4a853] transition-colors">
                          {imp.fileName}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            imp.status === "completed"
                              ? "bg-[#4aba7a]/15 text-[#4aba7a] border-[#4aba7a]/30"
                              : imp.status === "failed"
                              ? "bg-[#d45a4a]/15 text-[#d45a4a] border-[#d45a4a]/30"
                              : "bg-[#6b8cc7]/15 text-[#6b8cc7] border-[#6b8cc7]/30"
                          }`}
                        >
                          {imp.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d] tabular-nums">
                        {imp.successRows}/{imp.totalRows}
                      </td>
                      <td className="px-5 py-3.5 text-[#97979d]">
                        {new Date(imp.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportPage;