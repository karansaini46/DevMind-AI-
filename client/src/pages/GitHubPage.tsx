import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { API_URL, parseApiError } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function GitHubPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [connectedRepo, setConnectedRepo] = useState<string | null>(null);
  const [repoFullName, setRepoFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function loadRepository() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/settings/repository`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { connectedRepo: string | null };

        if (active) {
          setConnectedRepo(body.connectedRepo);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load repository settings");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadRepository();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleConnectGitHub() {
    if (!token) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/github/connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { url: string };
      window.location.assign(body.url);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to connect GitHub");
      setIsConnecting(false);
    }
  }

  async function handleConnectRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !repoFullName.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/settings/connect-repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ repoFullName: repoFullName.trim() }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { connectedRepo: string };
      setConnectedRepo(body.connectedRepo);
      setRepoFullName("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to connect repository");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnectRepository() {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/settings/disconnect-repo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setConnectedRepo(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to disconnect repository");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="github-page">
      <section className="page-hero-card">
        <p className="eyebrow">GitHub</p>
        <h1>Watch code before production does.</h1>
        <p>Connect your account, choose one repository, and keep new push reviews flowing into the workspace.</p>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {!user?.githubId ? (
        <EmptyState
          eyebrow="Not connected"
          title="Connect GitHub before production finds the problem first."
          body="Link the account first, then choose the repository worth watching."
          action={
            <button className="primary-button danger-button" type="button" onClick={() => void handleConnectGitHub()} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect GitHub"}
            </button>
          }
        />
      ) : (
        <section className="dashboard-panel github-panel">
          <div className="repository-summary">
            <div>
              <span>Account</span>
              <strong>{user.githubUsername ? `@${user.githubUsername}` : "Connected"}</strong>
            </div>
            <span className="status-pill">Connected</span>
          </div>

          {isLoading ? <div className="skeleton-stack" aria-label="Loading repository settings" /> : null}

          {!isLoading && connectedRepo ? (
            <div className="repository-summary">
              <div>
                <span>Monitored repository</span>
                <strong>{connectedRepo}</strong>
              </div>
              <button className="ghost-button" type="button" onClick={() => void handleDisconnectRepository()} disabled={isSaving}>
                {isSaving ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : null}

          {!isLoading && !connectedRepo ? (
            <form className="repository-form" onSubmit={(event) => void handleConnectRepository(event)}>
              <label>
                Repository name
                <input
                  value={repoFullName}
                  onChange={(event) => setRepoFullName(event.target.value)}
                  placeholder="username/project"
                  disabled={isSaving}
                />
              </label>
              <button className="primary-button" type="submit" disabled={isSaving || !repoFullName.trim()}>
                {isSaving ? "Connecting..." : "Connect repository"}
              </button>
            </form>
          ) : null}
        </section>
      )}
    </section>
  );
}
