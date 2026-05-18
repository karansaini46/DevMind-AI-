import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, type AutoReview, parseApiError } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoReviews, setAutoReviews] = useState<AutoReview[]>([]);
  const [autoReviewError, setAutoReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function loadAutoReviews() {
      try {
        const response = await fetch(`${API_URL}/reviews/auto?limit=10`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { reviews: AutoReview[] };
        setAutoReviews(body.reviews);
      } catch (error) {
        if (!controller.signal.aborted) {
          setAutoReviewError(
            error instanceof Error ? error.message : "Unable to load auto-reviews",
          );
        }
      }
    }

    async function subscribeToAutoReviews() {
      try {
        const response = await fetch(`${API_URL}/reviews/auto/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Unable to subscribe to auto-reviews");
        }

        await readAutoReviewStream(response.body, (review) => {
          setAutoReviews((current) => [
            review,
            ...current.filter((item) => item.id !== review.id),
          ].slice(0, 10));
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setAutoReviewError(
            error instanceof Error ? error.message : "Unable to stream auto-reviews",
          );
        }
      }
    }

    void loadAutoReviews();
    void subscribeToAutoReviews();

    return () => {
      controller.abort();
    };
  }, [token]);

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

      <section className="auto-reviews-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent Auto-Reviews</p>
            <h2>Reviews from repository pushes</h2>
          </div>
        </div>

        {autoReviewError ? <p className="form-error">{autoReviewError}</p> : null}

        {autoReviews.length ? (
          <div className="auto-review-list">
            {autoReviews.map((review) => (
              <Link
                className="auto-review-item"
                key={review.id}
                to={`/snippets/${review.snippetId}`}
              >
                <div>
                  <strong>{review.filename}</strong>
                  <span>{review.language}</span>
                </div>
                <p>{toReviewExcerpt(review.markdown)}</p>
                <span>
                  Production {formatReviewScore(review.productionScore, review.score)} · Demo{" "}
                  {formatReviewScore(review.demoScore, review.score)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-review">
            Push code to a connected repository and new reviews will appear here.
          </p>
        )}
      </section>
    </section>
  );
}

async function readAutoReviewStream(
  body: ReadableStream<Uint8Array>,
  onReview: (review: AutoReview) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = parseAutoReviewEvent(frame);

      if (event) {
        onReview(event);
      }
    }
  }
}

function parseAutoReviewEvent(frame: string) {
  const lines = frame.split(/\r?\n/);
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

  if (event !== "review" || !data) {
    return null;
  }

  return JSON.parse(data) as AutoReview;
}

function toReviewExcerpt(markdown: string) {
  const compact = markdown.replace(/\s+/g, " ").trim();

  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

function formatReviewScore(value: number | null, fallback: number) {
  return `${(value ?? fallback).toFixed(1)}/10`;
}
