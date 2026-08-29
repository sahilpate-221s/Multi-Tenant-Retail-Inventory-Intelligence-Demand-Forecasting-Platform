interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <p className="text-sm font-medium text-status-danger">{title}</p>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm font-medium px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;