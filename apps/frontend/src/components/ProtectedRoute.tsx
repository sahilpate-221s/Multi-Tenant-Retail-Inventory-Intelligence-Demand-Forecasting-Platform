import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import LoadingState from "./states/LoadingState";

const CASHIER_ALLOWED_PREFIXES = [
  "/pos",
  "/sales",
  "/khata",
  "/inventory",
  "/notifications",
];

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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

  // Cashier role boundary: Cashiers can only access counter & shelf check screens
  if (user.role === "cashier") {
    const isAllowed = CASHIER_ALLOWED_PREFIXES.some((prefix) =>
      location.pathname.startsWith(prefix)
    );
    if (!isAllowed) {
      return <Navigate to="/pos" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;