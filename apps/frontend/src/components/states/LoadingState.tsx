interface LoadingStateProps {
  message?: string;
}

function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className="h-5 w-5 rounded-full animate-spin"
        style={{
          border: "2px solid var(--color-sp-border-default)",
          borderTopColor: "var(--color-sp-accent)",
        }}
      />
      <p
        className="mt-3 text-sm"
        style={{ color: "var(--color-sp-text-muted)" }}
      >
        {message}
      </p>
    </div>
  );
}

export default LoadingState;