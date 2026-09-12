interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--color-sp-text-secondary)" }}
      >
        {title}
      </p>
      {description && (
        <p
          className="mt-1 text-sm max-w-sm"
          style={{ color: "var(--color-sp-text-muted)" }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;