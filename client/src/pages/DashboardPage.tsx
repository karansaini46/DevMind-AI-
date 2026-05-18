import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { RecentReviewCard } from "../components/RecentReviewCard";
import { RiskBadge } from "../components/RiskBadge";
import {
  API_URL,
  parseApiError,
  type AutoReview,
  type ManualReviewSummary,
} from "../lib/api";
import {
  getRiskLevel,
  getStoredProductionScore,
  getVerdict,
  type RiskLevel,
} from "../lib/reviews";
import { useAuthStore } from "../store/auth-store";

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
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

  const dashboard = useMemo(() => {
    const scoredReviews = manualReviews.map((review) => ({
      review,
      score: getStoredProductionScore(review.productionScore, review.score),
    }));
    const attentionQueue = scoredReviews
      .filter((item) => item.score < 70)
      .sort((left, right) => left.score - right.score);
    const lowestReview = attentionQueue[0] ?? [...scoredReviews].sort((left, right) => left.score - right.score)[0];
    const averageScore = scoredReviews.length
      ? Math.round(scoredReviews.reduce((sum, item) => sum + item.score, 0) / scoredReviews.length)
      : null;
    const repeatedRisk = getRepeatedRisk(scoredReviews.map((item) => getRiskLevel(item.score)));

    return {
      attentionQueue,
      lowestReview,
      averageScore,
      repeatedRisk,
    };
  }, [manualReviews]);

  return (
    <section className="dashboard-page">
      <section className="dashboard-hero diagnostic-hero">
        <div>
          <p className="eyebrow">Production Risk</p>
          <h1>{user?.name ? `${user.name.split(" ")[0]}, here is what still needs attention.` : "Here is what still needs attention."}</h1>
          <p>Recent reviews, unresolved risk, and the next code path worth reopening.</p>
        </div>
        <Link className="primary-link danger-link" to="/review">
          Start a review
        </Link>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="diagnostic-strip">
        <DiagnosticCard
          label="Needs attention"
          value={String(dashboard.attentionQueue.length)}
          note="Reviews below Fix First"
          tone={dashboard.attentionQueue.length ? "Critical" : "Stable"}
        />
        <DiagnosticCard
          label="Average score"
          value={dashboard.averageScore === null ? "—" : `${dashboard.averageScore}/100`}
          note="Recent review set"
          tone={dashboard.averageScore === null ? "Warning" : getRiskLevel(dashboard.averageScore)}
        />
        <DiagnosticCard
          label="Repeating pattern"
          value={dashboard.repeatedRisk.label}
          note={dashboard.repeatedRisk.note}
          tone={dashboard.repeatedRisk.label}
        />
      </div>

      <div className="dashboard-columns diagnostic-columns">
        <section className="dashboard-panel next-fix-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Fix next</p>
              <h2>Lowest recent production score</h2>
            </div>
          </div>

          {isLoading ? <div className="skeleton-stack" aria-label="Loading next fix" /> : null}
          {!isLoading && dashboard.lowestReview ? (
            <article className="next-fix-card">
              <div>
                <RiskBadge label={getVerdict(dashboard.lowestReview.score)} />
                <strong>{dashboard.lowestReview.score}/100</strong>
              </div>
              <h3>{dashboard.lowestReview.review.filename}</h3>
              <p>
                This is the weakest reviewed path in the recent set. Reopen it before lower-risk work.
              </p>
              <Link className="ghost-link" to={`/reviews/${dashboard.lowestReview.review.id}`}>
                Open report
              </Link>
            </article>
          ) : !isLoading ? (
            <EmptyState
              title="No reviews yet. Your bugs are still hiding."
              body="Paste code. Get the senior verdict."
            />
          ) : null}
        </section>

        <section className="dashboard-panel attention-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Attention queue</p>
              <h2>Reviews still carrying risk</h2>
            </div>
          </div>

          {dashboard.attentionQueue.length ? (
            <div className="review-card-list">
              {dashboard.attentionQueue.slice(0, 4).map(({ review }) => (
                <RecentReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : !isLoading ? (
            <EmptyState
              title="Nothing risky in the recent set."
              body="Safe to ship is earned one review at a time."
            />
          ) : null}
        </section>
      </div>

      <div className="dashboard-columns diagnostic-columns">
        <section className="dashboard-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Recent reviews</p>
              <h2>What you judged last</h2>
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
              title="Nothing reviewed. Nothing trusted."
              body="Every report starts with one pasted code path."
            />
          ) : null}
        </section>

        <section className="dashboard-panel github-status-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">GitHub</p>
              <h2>Repository watch</h2>
            </div>
            <Link className="ghost-link" to="/github">
              Configure
            </Link>
          </div>

          <div className="github-diagnostic">
            <div>
              <span>Connection</span>
              <strong>{user?.githubId ? "Connected" : "Not connected"}</strong>
            </div>
            <div>
              <span>Repository</span>
              <strong>{connectedRepo ?? "None linked"}</strong>
            </div>
          </div>

          {autoReviews.length ? (
            <div className="auto-review-list">
              {autoReviews.slice(0, 3).map((review) => (
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
              title="Connect GitHub before production finds the problem first."
              body="Push reviews appear here after one repository is connected."
            />
          )}
        </section>
      </div>
    </section>
  );
}

function DiagnosticCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: RiskLevel;
}) {
  return (
    <article className="diagnostic-card">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <RiskBadge label={tone} />
      </div>
      <small>{note}</small>
    </article>
  );
}

function getRepeatedRisk(levels: RiskLevel[]) {
  if (!levels.length) {
    return {
      label: "Warning" as RiskLevel,
      note: "No review pattern yet",
    };
  }

  const counts = levels.reduce<Record<RiskLevel, number>>(
    (current, level) => ({ ...current, [level]: current[level] + 1 }),
    { Stable: 0, Warning: 0, Risky: 0, Critical: 0 },
  );
  const [label, count] = (Object.entries(counts) as Array<[RiskLevel, number]>).sort(
    (left, right) => right[1] - left[1],
  )[0];

  if (count === 1 && levels.length > 1) {
    return {
      label: "Warning" as RiskLevel,
      note: "No repeated band yet",
    };
  }

  return {
    label,
    note: `${count} of last ${levels.length} reviews`,
  };
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
