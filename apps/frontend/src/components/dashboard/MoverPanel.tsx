import { Link } from "react-router-dom";

interface FastMover {
  productId: string;
  productName: string;
  unitsSold: number;
}

interface SlowMover {
  productId: string;
  productName: string;
  unitsSold: number;
  daysSinceLastSale: number | null;
}

function MoverPanel({
  type,
  items,
}: {
  type: "fast" | "slow";
  items: FastMover[] | SlowMover[];
}) {
  const isFast = type === "fast";

  return (
    <div
      className={`relative flex-1 sp-glass rounded-lg overflow-hidden ${
        isFast ? "border-l-2 border-l-[#d4a853]" : "border-l-2 border-l-[#303035]"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid var(--color-sp-border-subtle)" }}
      >
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "1px",
            background: isFast ? "var(--color-sp-accent)" : "var(--color-sp-text-ghost)",
          }}
        />
        <span className="sp-label" style={{ fontSize: "0.625rem" }}>
          {isFast ? "FAST MOVERS" : "SLOW MOVERS"}
        </span>
      </div>

      {/* Items */}
      <div className="px-5 py-2">
        {items.length === 0 ? (
          <p
            className="py-4 text-center"
            style={{ fontSize: "0.8125rem", color: "var(--color-sp-text-muted)" }}
          >
            {isFast ? "No sales in this period yet." : "No active products yet."}
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li
                key={item.productId}
                className="group flex items-center justify-between py-2.5 transition-colors duration-150"
                style={{ borderBottom: "1px solid var(--color-sp-border-subtle)" }}
              >
                <Link
                  to={`/products/${item.productId}`}
                  className="text-[0.8125rem] transition-colors duration-150 hover:underline"
                  style={{ color: "var(--color-sp-text-primary)" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-sp-accent)")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-sp-text-primary)")}
                >
                  {item.productName}
                </Link>
                <div className="flex items-center gap-3">
                  <span
                    className="sp-font-mono text-[0.75rem]"
                    style={{
                      color: isFast
                        ? "var(--color-status-success)"
                        : "var(--color-sp-text-muted)",
                    }}
                  >
                    {item.unitsSold} sold
                  </span>
                  {!isFast && "daysSinceLastSale" in item && (
                    <span
                      className="sp-font-mono text-[0.6875rem]"
                      style={{ color: "var(--color-sp-text-ghost)" }}
                    >
                      {item.daysSinceLastSale !== null
                        ? `${item.daysSinceLastSale}d`
                        : "never"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MoverPanel;
