import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { RecentReviewCard } from "../components/RecentReviewCard";
import {
  API_URL,
  parseApiError,
  type AutoReview,
  type ManualReviewSummary,
} from "../lib/api";
import {
  goals,
  labelForValue,
  readOnboardingPreferences,
  reviewStyles,
  roles,
} from "../lib/onboarding";
import { useAuthStore } from "../store/auth-store";

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const preferences = readOnboardingPreferences();
  const [manualReviews, setManualReviews] = useState<ManualReviewSummary[]>([]);
  const [autoReviews, setAutoReviews] = useState<AutoReview[]>([]);
  const [connectedRepo, setConnectedRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const [historyResponse, autoResponse, repositoryResponse] = await Promise.all([
          fetch(`${API_URL}/reviews/history?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
            signal: controller.signal,
          }),
          fetch(`${API_URL}/reviews/auto?limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
            signal: controller.signal,
          }),
          fetch(`${API_URL}/settings/repository`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
            signal: controller.signal,
          }),
        ]);

        if (!historyResponse.ok) {
          throw new Error(await parseApiError(historyResponse));
        }

        if (!autoResponse.ok) {
          throw new Error(await parseApiError(autoResponse));
        }

        if (!repositoryResponse.ok) {
          throw new Error(await parseApiError(repositoryResponse));
        }

        const historyBody = (await historyResponse.json()) as { reviews: ManualReviewSummary[] };
        const autoBody = (await autoResponse.json()) as { reviews: AutoReview[] };
        const repositoryBody = (await repositoryResponse.json()) as { connectedRepo: string | null };

        setManualReviews(historyBody.reviews);
        setAutoReviews(autoBody.reviews);
        setConnectedRepo(repositoryBody.connectedRepo);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    async function subscribeToAutoReviews() {
      try {
        const response = await fetch(`${API_URL}/reviews/auto/events`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          return;
        }

        await readAutoReviewStream(response.body, (review) => {
          setAutoReviews((current) => [review, ...current.filter((item) => item.id !== review.id)].slice(0, 10));
        });
      } catch {
        // Live updates are helpful, not required for the page to function.
      }
    }

    void loadDashboard();
    void subscribeToAutoReviews();

    return () => controller.abort();
  }, [token]);

  const metrics = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = manualReviews.filter((review) => new Date(review.createdAt).getTime() >= sevenDaysAgo);
    const productionScores = manualReviews
      .map((review) => review.productionScore)
      .filter((score): score is number => typeof score === "number");
    const averageScore = productionScores.length
      ? productionScores.reduce((sum, score) => sum + score, 0) / productionScores.length
      : null;

    return {
      reviewsThisWeek: thisWeek.length,
      averageScore,
      savedSnippets: new Set(manualReviews.map((review) => review.snippetId)).size,
    };
  }, [manualReviews]);

  return (
    <section className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Workspace pulse</p>
          <h1>Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
          <p>
            {labelForValue(roles, preferences.role)} · {labelForValue(reviewStyles, preferences.reviewStyle)} ·{" "}
            {labelForValue(goals, preferences.goal)}
          </p>
        </div>
        <Link className="primary-link danger-link" to="/review">
          Start a review
        </Link>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="metric-grid">
        <MetricCard label="Reviews this week" value={String(metrics.reviewsThisWeek)} note="Latest 50 reviews" />
        <MetricCard
          label="Average production score"
          value={metrics.averageScore === null ? "—" : `${metrics.averageScore.toFixed(1)}/10`}
          note="Recent review set"
        />
        <MetricCard label="Saved snippets" value={String(metrics.savedSnippets)} note="From completed reviews" />
        <MetricCard
          label="GitHub status"
          value={user?.githubId ? "Connected" : "Not connected"}
          note={connectedRepo ?? "No repository linked"}
        />
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Recent reviews</p>
              <h2>Last manual passes</h2>
            </div>
            <Link className="ghost-link" to="/snippets">
              All snippets
            </Link>
          </div>

          {isLoading ? <div className="skeleton-stack" aria-label="Loading reviews" /> : null}
          {manualReviews.length ? (
            <div className="review-card-list">
              {manualReviews.slice(0, 4).map((review) => (
                <RecentReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : !isLoading ? (
            <EmptyState
              title="No reviews yet. Your bugs are still hiding."
              body="Start with a pasted snippet and build your review history from there."
            />
          ) : null}
        </section>

        <section className="dashboard-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Repository monitoring</p>
              <h2>Recent push reviews</h2>
            </div>
            <Link className="ghost-link" to="/github">
              Configure
            </Link>
          </div>

          {autoReviews.length ? (
            <div className="auto-review-list">
              {autoReviews.slice(0, 4).map((review) => (
                <Link className="auto-review-item" key={review.id} to={`/snippets/${review.snippetId}`}>
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
            <EmptyState
              title="Connect GitHub and let DevMind watch your pushes before production does."
              body="Repository reviews appear here after a connected repo receives new code."
            />
          )}
        </section>
      </div>

      <section className="quick-actions-grid">
        <QuickAction title="Search reviewed code" body="Find snippets by meaning." to="/search" />
        <QuickAction title="Check GitHub setup" body="Review repository monitoring." to="/github" />
        <QuickAction title="Adjust review defaults" body="Tune your cockpit posture." to="/settings" />
      </section>
    </section>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function QuickAction({ title, body, to }: { title: string; body: string; to: string }) {
  return (
    <Link className="quick-action-card" to={to}>
      <strong>{title}</strong>
      <span>{body}</span>
    </Link>
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
  const event = lines.find((line) => line.startsWith("event:"))?.slice("event:".length).trim();
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
