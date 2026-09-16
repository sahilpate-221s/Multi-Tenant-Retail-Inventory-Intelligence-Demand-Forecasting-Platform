import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useBulkRestockPreview, useBulkRestockCommit } from "../hooks/useBulkRestock";
import type { RestockPreviewResult, RestockCommitResult } from "../lib/types";
import { ApiError } from "../lib/apiClient";

function MatchBadge({ matchType, confidence }: { matchType: string; confidence: number }) {
  if (matchType === "exact_sku") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4aba7a]/15 text-[#4aba7a] border border-[#4aba7a]/30">
        SKU MATCH
      </span>
    );
  }
  if (matchType === "exact_name") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4aba7a]/15 text-[#4aba7a] border border-[#4aba7a]/30">
        EXACT
      </span>
    );
  }
  // fuzzy_name
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30">
      FUZZY {Math.round(confidence * 100)}%
    </span>
  );
}

function BulkRestockPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestockPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<RestockCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useBulkRestockPreview();
  const commitMutation = useBulkRestockCommit();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(null);
    setCommitResult(null);
    setError(null);
  }

  async function handlePreview() {
    if (!file) return;
    setError(null);
    try {
      const result = await previewMutation.mutateAsync(file);
      setPreview(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to parse CSV file.");
    }
  }

  async function handleCommit() {
    if (!file) return;
    setError(null);
    try {
      const result = await commitMutation.mutateAsync(file);
      setCommitResult(result);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong during restock.");
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setCommitResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const totalAccepted = preview ? preview.validRows.length + preview.warnings.length : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div>
        <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
          INVENTORY OPERATIONS
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-0.5">
          Bulk Inventory Restock
        </h1>
        <p className="mt-1 text-xs text-[#97979d]">
          Upload a CSV with incoming stock quantities. Supports matching by product name, SKU, or fuzzy name matching.
        </p>
      </div>

      {/* CSV Format Help */}
      <div className="mt-4 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121216]/60">
        <p className="text-[10px] uppercase tracking-wider text-[#97979d] font-bold mb-2">ACCEPTED CSV FORMATS</p>
        <div className="flex flex-col sm:flex-row gap-4 text-xs text-[#97979d]">
          <div className="flex-1">
            <p className="text-[#e8e6e3] font-semibold mb-1">By Product Name:</p>
            <code className="block bg-[#0a0a0c] rounded px-2 py-1.5 text-[10px] leading-relaxed border border-[rgba(255,255,255,0.06)]">
              product,quantity<br />
              Maggi 2-Minute Noodles 70g,200<br />
              Coca-Cola Original 750ml,150
            </code>
          </div>
          <div className="flex-1">
            <p className="text-[#e8e6e3] font-semibold mb-1">By SKU Code:</p>
            <code className="block bg-[#0a0a0c] rounded px-2 py-1.5 text-[10px] leading-relaxed border border-[rgba(255,255,255,0.06)]">
              sku,quantity<br />
              MAG-70G-01,200<br />
              BEV-COKE-750,150
            </code>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mt-6 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[#121216]/90 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-xs text-[#97979d] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-semibold file:bg-[#d4a853] file:text-[#0c0c0e] hover:file:bg-[#e8be66] file:cursor-pointer cursor-pointer"
          />
          {file && !preview && !commitResult && (
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {previewMutation.isPending ? "Analyzing CSV..." : "Preview Restock →"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-[#d45a4a] p-2 rounded bg-[#d45a4a]/10 border border-[#d45a4a]/25">
            {error}
          </p>
        )}

        {/* ── Commit Success ── */}
        {commitResult && (
          <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)]">
            <div className="bg-[#4aba7a]/10 border border-[#4aba7a]/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✓</span>
                <h3 className="text-sm font-bold text-[#4aba7a]">
                  Restock Complete — {commitResult.updatedCount} products updated
                </h3>
              </div>
              {commitResult.skippedCount > 0 && (
                <p className="text-xs text-[#d4a853] mb-3">
                  {commitResult.skippedCount} rows were skipped due to errors.
                </p>
              )}
              <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#16161d] text-[#97979d] uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Previous Stock</th>
                      <th className="px-3 py-2">New Stock</th>
                      <th className="px-3 py-2">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {commitResult.results.map((r) => (
                      <tr key={r.productId} className="text-[#e8e6e3]">
                        <td className="px-3 py-2 font-semibold">{r.productName}</td>
                        <td className="px-3 py-2 text-[#97979d] tabular-nums">{r.previousStock}</td>
                        <td className="px-3 py-2 font-bold text-[#4aba7a] tabular-nums">{r.newStock}</td>
                        <td className="px-3 py-2 text-[#d4a853] tabular-nums">+{r.newStock - r.previousStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/inventory"
                  className="text-xs text-[#d4a853] hover:text-[#e8be66] font-semibold transition-colors"
                >
                  ← View Inventory Ledger
                </Link>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#97979d] hover:text-[#e8e6e3] transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {preview && (
          <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)]">
            {/* Summary Stats */}
            <div className="flex flex-wrap gap-4 text-xs mb-5">
              <span className="text-[#4aba7a] font-bold">{preview.validRows.length} EXACT MATCHES</span>
              <span className="text-[#d4a853] font-bold">{preview.warnings.length} FUZZY MATCHES</span>
              <span className="text-[#d45a4a] font-bold">{preview.errors.length} ERRORS</span>
              <span className="text-[#97979d]">{preview.totalRows} TOTAL ROWS</span>
            </div>

            {/* Exact Matches Table */}
            {preview.validRows.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] uppercase text-[#97979d] font-bold mb-2">
                  EXACT MATCHES — Ready to commit
                </p>
                <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#16161d] text-[#97979d] uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">CSV Input</th>
                        <th className="px-3 py-2">Matched Product</th>
                        <th className="px-3 py-2">Match</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {preview.validRows.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[#181822]/60 text-[#e8e6e3]">
                          <td className="px-3 py-2 text-[#5c5c64]">{r.rowNumber}</td>
                          <td className="px-3 py-2 text-[#97979d] max-w-[180px] truncate">{r.csvProductName}</td>
                          <td className="px-3 py-2 font-semibold">{r.productName}</td>
                          <td className="px-3 py-2">
                            <MatchBadge matchType={r.matchType} confidence={r.matchConfidence} />
                          </td>
                          <td className="px-3 py-2 text-[#d4a853] font-semibold tabular-nums">+{r.quantity}</td>
                          <td className="px-3 py-2 text-[#97979d] tabular-nums">
                            {r.currentStock} → <span className="text-[#4aba7a] font-semibold">{r.newStock}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fuzzy Matches Table (Warnings) */}
            {preview.warnings.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] uppercase text-[#d4a853] font-bold">
                    FUZZY MATCHES — Please verify these
                  </p>
                  <span className="text-[9px] text-[#97979d] bg-[#d4a853]/10 px-1.5 py-0.5 rounded border border-[#d4a853]/20">
                    Auto-matched by name similarity
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[#d4a853]/30 bg-[#d4a853]/[0.03]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a1810] text-[#d4a853] uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">CSV Input</th>
                        <th className="px-3 py-2">Best Match</th>
                        <th className="px-3 py-2">Confidence</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(212,168,83,0.1)]">
                      {preview.warnings.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[#1a1810]/60 text-[#e8e6e3]">
                          <td className="px-3 py-2 text-[#5c5c64]">{r.rowNumber}</td>
                          <td className="px-3 py-2 text-[#d4a853] max-w-[180px] truncate font-medium">{r.csvProductName}</td>
                          <td className="px-3 py-2 font-semibold">{r.productName}</td>
                          <td className="px-3 py-2">
                            <MatchBadge matchType={r.matchType} confidence={r.matchConfidence} />
                          </td>
                          <td className="px-3 py-2 text-[#d4a853] font-semibold tabular-nums">+{r.quantity}</td>
                          <td className="px-3 py-2 text-[#97979d] tabular-nums">
                            {r.currentStock} → <span className="text-[#4aba7a] font-semibold">{r.newStock}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors Table */}
            {preview.errors.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] uppercase text-[#d45a4a] font-bold mb-2">
                  UNMATCHED / ERRORS — These rows will be skipped
                </p>
                <div className="overflow-x-auto rounded-lg border border-[#d45a4a]/30 bg-[#d45a4a]/[0.03]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a1212] text-[#d45a4a] uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Raw Data</th>
                        <th className="px-3 py-2">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(212,90,74,0.1)]">
                      {preview.errors.map((e, idx) => (
                        <tr key={idx} className="text-[#e8e6e3]">
                          <td className="px-3 py-2 text-[#5c5c64]">{e.rowNumber}</td>
                          <td className="px-3 py-2 text-[#97979d] max-w-[200px] truncate font-mono text-[10px]">
                            {Object.values(e.rawData).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-[#d45a4a]">{e.errorMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {totalAccepted > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleCommit}
                  disabled={commitMutation.isPending}
                  className="bg-[#d4a853] hover:bg-[#e8be66] text-[#0c0c0e] text-xs font-semibold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_20px_rgba(212,168,83,0.25)] active:scale-95 disabled:opacity-50"
                >
                  {commitMutation.isPending
                    ? "Processing Restock..."
                    : `Commit Restock (${totalAccepted} Products)`}
                </button>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#97979d] hover:text-[#e8e6e3] transition-colors px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-6 flex items-center gap-4 text-xs font-mono">
        <Link
          to="/inventory"
          className="text-[#97979d] hover:text-[#d4a853] transition-colors"
        >
          ← Back to Inventory Ledger
        </Link>
        <span className="text-[#303035]">•</span>
        <Link
          to="/import"
          className="text-[#97979d] hover:text-[#d4a853] transition-colors"
        >
          Sales Import →
        </Link>
      </div>
    </div>
  );
}

export default BulkRestockPage;
