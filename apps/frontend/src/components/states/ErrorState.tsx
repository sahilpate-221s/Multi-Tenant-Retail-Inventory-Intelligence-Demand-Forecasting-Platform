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
      <p
        className="text-sm font-medium"
        style={{ color: "var(--color-status-danger)" }}
      >
        {title}
      </p>
      <p
        className="mt-1 text-sm max-w-sm"
        style={{ color: "var(--color-sp-text-muted)" }}
      >
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm font-medium px-4 py-1.5 transition-colors duration-150"
          style={{
            background: "var(--color-sp-surface)",
            color: "var(--color-sp-text-primary)",
            border: "1px solid var(--color-sp-border-default)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--color-sp-accent-dim)")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--color-sp-border-default)")}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;