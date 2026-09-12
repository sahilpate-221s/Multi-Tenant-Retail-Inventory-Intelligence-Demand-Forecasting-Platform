import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In later phases this is where we'd send the error to an
    // error-tracking service (Phase 22 — Observability). For now,
    // logging to console is enough to prove the boundary caught it.
    console.error("Unhandled error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "var(--color-sp-base)" }}
        >
          <div className="text-center max-w-sm">
            <p
              className="text-lg font-semibold"
              style={{ color: "var(--color-sp-text-primary)" }}
            >
              Something went wrong
            </p>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-sp-text-muted)" }}
            >
              An unexpected error occurred. You can try reloading the page.
            </p>
            <button
              onClick={() => window.location.assign("/dashboard")}
              className="mt-4 text-sm font-medium px-4 py-2 transition-colors duration-150"
              style={{
                background: "var(--color-sp-surface)",
                color: "var(--color-sp-text-primary)",
                border: "1px solid var(--color-sp-border-default)",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;