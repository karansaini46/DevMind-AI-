import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

export function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const acceptToken = useAuthStore((state) => state.acceptToken);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    void acceptToken(token)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  }, [acceptToken, navigate, searchParams]);

  return (
    <main className="app-shell">
      <section className="status-card">
        <p className="eyebrow">DevMind</p>
        <h1>Signing you in.</h1>
      </section>
    </main>
  );
}
