import { useParams, Link } from "react-router-dom";
import { useImportDetail } from "../hooks/useImports";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: detail, isLoading, isError, refetch } = useImportDetail(id ?? null);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-mono">
      <Link to="/import" className="text-xs text-[#97979d] hover:text-[#d4a853] transition-colors flex items-center gap-1.5">
        ← Back to Ingestion Pipeline
      </Link>

      <div className="mt-6">
        {isLoading && <LoadingState message="Connecting to worker telemetry..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {detail && (
          <div className="bg-[#121216]/90 border border-[rgba(255,255,255,0.08)] rounded-xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <span className="text-[10px] uppercase tracking-widest text-[#d4a853]">
              BATCH INGESTION MONITOR
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#e8e6e3] mt-1">
              {detail.fileName}
            </h1>

            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <span className="text-[#97979d]">
                Status: <strong className="text-[#e8e6e3]">{detail.status.toUpperCase()}</strong>
              </span>
              <span className="text-[#4aba7a] font-bold">{detail.successRows} SUCCEEDED</span>
              <span className="text-[#d45a4a] font-bold">{detail.errorRows} FAILED</span>
              <span className="text-[#97979d]">{detail.totalRows} TOTAL ROWS</span>
            </div>

            {detail.status === "processing" && (
              <p className="mt-3 text-xs text-[#d4a853] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-ping" />
                Background worker is ingesting rows — stream polls in real time.
              </p>
            )}

            {detail.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold text-[#d45a4a] uppercase mb-2">
                  Ingestion Exceptions
                </h3>
                <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#16161d] text-[#97979d] uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2">Row</th>
                        <th className="px-4 py-2">Exception Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                      {detail.errors.map((e) => (
                        <tr key={e.id} className="text-[#e8e6e3]">
                          <td className="px-4 py-2 text-[#5c5c64]">{e.rowNumber}</td>
                          <td className="px-4 py-2 text-[#d45a4a]">{e.errorMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportDetailPage;