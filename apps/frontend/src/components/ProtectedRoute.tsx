import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import LoadingState from "./states/LoadingState";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-sp-base)" }}
      >
        <LoadingState message="Checking session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;