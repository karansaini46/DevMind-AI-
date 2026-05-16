import { useEffect, useState, type FormEvent } from "react";
import { API_URL, parseApiError } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [connectedRepo, setConnectedRepo] = useState<string | null>(null);
  const [repoFullName, setRepoFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load repository settings",
          );
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
        body: JSON.stringify({
          repoFullName: repoFullName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { connectedRepo: string };
      setConnectedRepo(body.connectedRepo);
      setRepoFullName("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to connect repository",
      );
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setConnectedRepo(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to disconnect repository",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-page">
      <section className="settings-card">
        <p className="eyebrow">GitHub Repository</p>
        <h1>Automatic reviews</h1>
        <p>
          Make sure you&apos;ve connected your GitHub account first. DevMind will
          automatically review every file you push.
        </p>

        {isLoading ? <p className="form-note">Loading repository settings...</p> : null}

        {!isLoading && connectedRepo ? (
          <div className="repository-summary">
            <div>
              <span>Connected repository</span>
              <strong>{connectedRepo}</strong>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => void handleDisconnectRepository()}
              disabled={isSaving}
            >
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
                placeholder="username/my-project"
                disabled={isSaving || !user?.githubId}
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={isSaving || !repoFullName.trim() || !user?.githubId}
            >
              {isSaving ? "Connecting..." : "Connect Repository"}
            </button>
          </form>
        ) : null}

        {!user?.githubId ? (
          <p className="form-note">Connect your GitHub account from the dashboard first.</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </section>
  );
}
