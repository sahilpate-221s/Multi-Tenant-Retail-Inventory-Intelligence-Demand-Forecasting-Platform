import { useParams, Link } from "react-router-dom";
import { useImportDetail } from "../hooks/useImports";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: detail, isLoading, isError, refetch } = useImportDetail(id ?? null);

  return (
    <div className="p-8">
      <Link to="/import" className="text-sm text-slate-500 hover:underline">← Back to Import</Link>

      <div className="mt-4">
        {isLoading && <LoadingState message="Loading import..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {detail && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h1 className="text-lg font-semibold text-slate-800">{detail.fileName}</h1>
            <div className="mt-2 flex gap-4 text-sm">
              <span>Status: <strong>{detail.status}</strong></span>
              <span className="text-status-success">{detail.successRows} succeeded</span>
              <span className="text-status-danger">{detail.errorRows} failed</span>
              <span className="text-slate-400">{detail.totalRows} total</span>
            </div>
            {detail.status === "processing" && (
              <p className="mt-2 text-xs text-slate-400">Still processing — this page updates automatically.</p>
            )}

            {detail.errors.length > 0 && (
              <table className="w-full text-sm mt-4 border border-slate-100 rounded">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr><th className="px-2 py-1">Row</th><th className="px-2 py-1">Issue</th></tr>
                </thead>
                <tbody>
                  {detail.errors.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-slate-400">{e.rowNumber}</td>
                      <td className="px-2 py-1 text-status-danger">{e.errorMessage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportDetailPage;