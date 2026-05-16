import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, parseApiError } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnectGitHub() {
    if (!token) {
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      const response = await fetch(`${API_URL}/auth/github/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { url: string };
      window.location.assign(body.url);
    } catch (error) {
      setConnectError(
        error instanceof Error ? error.message : "Unable to connect GitHub",
      );
      setIsConnecting(false);
    }
  }

  return (
    <section className="dashboard-page">
      <section className="hero-card dashboard-card">
        <p className="eyebrow">Workspace</p>
        <h1>Welcome back.</h1>
        <p className="hero-copy">
          Your account is ready for the product layer that comes next.
        </p>
        <Link className="primary-link" to="/review">
          Start a code review
        </Link>
      </section>

      <section className="connect-card">
        <p className="eyebrow">GitHub</p>
        {user?.githubId ? (
          <>
            <h2>Connected</h2>
            <p>
              {user.githubUsername
                ? `Linked as @${user.githubUsername}.`
                : "Your GitHub account is linked."}
            </p>
          </>
        ) : (
          <>
            <h2>Connect GitHub</h2>
            <p>
              Link the same account you use for source control so future repository
              features have a secure foundation.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void handleConnectGitHub()}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect GitHub"}
            </button>
            {connectError ? <p className="form-error">{connectError}</p> : null}
          </>
        )}
      </section>
    </section>
  );
}
