import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export function ProtectedRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!initialized) {
    return (
      <main className="app-shell">
        <section className="status-card">
          <p className="eyebrow">DevMind</p>
          <h1>Loading review cockpit.</h1>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
