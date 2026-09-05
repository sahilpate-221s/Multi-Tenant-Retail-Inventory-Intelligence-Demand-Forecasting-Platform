function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-status-warning-bg text-status-warning",
    medium: "bg-status-info-bg text-status-info",
    high: "bg-status-success-bg text-status-success",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[confidence]}`}>
      {confidence} confidence
    </span>
  );
}

export default ConfidenceBadge;