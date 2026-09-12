import { forwardRef, type ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Specialized container for the StockPilot Dashboard.
 * Houses the 3D canvas overlay, scroll tracking reference,
 * and dark viewport bounding constraints.
 */
const DashboardShell = forwardRef<HTMLDivElement, DashboardShellProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative min-h-full pb-16 ${className}`}
        style={{ background: "var(--color-sp-base)" }}
      >
        {children}
      </div>
    );
  }
);

DashboardShell.displayName = "DashboardShell";

export default DashboardShell;
