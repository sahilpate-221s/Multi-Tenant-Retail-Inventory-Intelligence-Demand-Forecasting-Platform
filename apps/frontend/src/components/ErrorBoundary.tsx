import { Component, type ErrorInfo, type ReactNode } from "react";
import { telemetry } from "../lib/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    telemetry.reportError(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c0c0e] text-[#f4f4f5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121218] border border-rose-500/30 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Application Exception</h2>
              <p className="text-xs text-[#97979d] mt-1">
                A UI exception occurred. A crash report with diagnostics has been logged to telemetry.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#0b0b0f] rounded-lg text-left text-xs text-rose-300 font-mono overflow-x-auto max-h-32 border border-white/5">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-[#d4a853] text-[#0c0c0e] hover:bg-[#e2b762] transition-colors cursor-pointer"
              >
                Reload Screen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;