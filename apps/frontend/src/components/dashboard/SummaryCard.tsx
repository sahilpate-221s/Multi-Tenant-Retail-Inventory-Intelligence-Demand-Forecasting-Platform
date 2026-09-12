function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div
      className="p-4 rounded-sm transition-colors duration-150 hover:border-[#45454d]"
      style={{
        background: "var(--color-sp-surface)",
        border: "1px solid var(--color-sp-border-subtle)",
      }}
    >
      <p
        className="sp-label"
        style={{ fontSize: "0.6875rem", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-semibold sp-font-mono"
        style={{ color: "var(--color-sp-text-primary)" }}
      >
        {value}
      </p>
      {sublabel && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--color-sp-text-muted)" }}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}

export default SummaryCard;