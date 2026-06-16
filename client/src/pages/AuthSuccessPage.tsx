import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { useAuthStore } from "../store/auth-store";

export function AuthSuccessPage() {
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    refreshSession()
      .then((success) => {
        if (!active) return;
        if (success) {
          navigate(hasCompletedOnboarding() ? "/dashboard" : "/onboarding", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      })
      .catch(() => {
        if (active) {
          navigate("/login", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [refreshSession, navigate]);

  return (
    <main className="app-shell">
      <section className="status-card">
        <p className="eyebrow">DevMind</p>
        <h1>Signing you in.</h1>
      </section>
    </main>
  );
}
