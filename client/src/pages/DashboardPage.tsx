import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  API_URL,
  parseApiError,
  type DashboardStats,
} from "../lib/api";
import { getLanguageLabel } from "../lib/code-editor";
import { authConfig, apiClient, getRequestErrorMessage } from "../lib/http";
import {
  formatReviewDate,
  getScoreTone,
  getSourceLabel,
} from "../lib/review-display";
import { useAuthStore } from "../store/auth-store";

const chartColors = ["#3366ff", "#12b76a", "#f79009", "#7a5af8", "#f04438"];

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadStats = useCallback(async () => {
    if (!token) {
      return;
    }

    setDashboardError(null);

    try {
      const response = await apiClient.get<DashboardStats>(
        "/dashboard/stats",
        authConfig(token),
      );
      setStats(response.data);
    } catch (error) {
      setDashboardError(
        getRequestErrorMessage(error, "Unable to load dashboard"),
      );
    } finally {
      setIsLoadingStats(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function subscribeToReviews() {
      try {
        const response = await fetch(`${API_URL}/reviews/auto/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Unable to subscribe to GitHub reviews");
        }

        await readReviewStream(response.body, () => {
          void loadStats();
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboardError(
            error instanceof Error ? error.message : "Unable to stream reviews",
          );
        }
      }
    }

    void subscribeToReviews();

    return () => {
      controller.abort();
    };
  }, [loadStats, token]);

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
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your review history at a glance.</h1>
        </div>
        <Link className="primary-link dashboard-action" to="/review">
          Start a code review
        </Link>
      </section>

      {dashboardError ? <p className="form-error">{dashboardError}</p> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total Reviews</span>
          <strong>{stats?.totalReviews ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Average Score</span>
          <div className={`score-chip ${getScoreTone(stats?.averageScore ?? 0)}`}>
            {formatAverageScore(stats?.averageScore ?? 0)}
          </div>
        </article>
        <article className="stat-card">
          <span>Reviews This Week</span>
          <strong>{stats?.reviewsThisWeek ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Languages Used</span>
          <strong>{stats?.languagesUsed ?? 0}</strong>
        </article>
      </section>

      {isLoadingStats ? <p className="empty-review">Loading dashboard.</p> : null}

      {stats && stats.totalReviews === 0 ? (
        <section className="empty-state dashboard-empty-state">
          <h2>No reviews yet.</h2>
          <p>Paste your first code snippet to get started.</p>
          <Link className="primary-link" to="/review">
            Review your first snippet
          </Link>
        </section>
      ) : null}

      {stats && stats.totalReviews > 0 ? (
        <>
          <section className="dashboard-grid">
            <article className="panel-card chart-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Trend</p>
                  <h2>Average quality score</h2>
                </div>
              </div>
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.scoreOverTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} />
                    <YAxis domain={[0, 10]} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value}/10`, "Average score"]}
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#3366ff"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel-card chart-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Languages</p>
                  <h2>Review mix</h2>
                </div>
              </div>
              <div className="donut-layout">
                <div className="chart-shell donut-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.languageBreakdown}
                        dataKey="count"
                        nameKey="language"
                        innerRadius={54}
                        outerRadius={84}
                        paddingAngle={3}
                      >
                        {stats.languageBreakdown.map((entry, index) => (
                          <Cell
                            key={entry.language}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => [
                          value,
                          getLanguageLabel(String(item.payload.language)),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="chart-legend">
                  {stats.languageBreakdown.map((entry, index) => (
                    <li key={entry.language}>
                      <span
                        style={{
                          backgroundColor: chartColors[index % chartColors.length],
                        }}
                      />
                      {getLanguageLabel(entry.language)} ({entry.count})
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>

          <section className="panel-card table-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent Reviews</p>
                <h2>Latest feedback</h2>
              </div>
              <Link className="ghost-link" to="/history">
                View all
              </Link>
            </div>
            <div className="table-wrap">
              <table className="review-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Language</th>
                    <th>Score</th>
                    <th>Source</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReviews.map((review) => (
                    <tr key={review.id}>
                      <td>{review.snippet.filename}</td>
                      <td>
                        <span className="language-badge">
                          {getLanguageLabel(review.snippet.language)}
                        </span>
                      </td>
                      <td>
                        <span className={`score-badge ${getScoreTone(review.score)}`}>
                          {review.score}/10
                        </span>
                      </td>
                      <td>
                        <span className={`source-badge is-${review.source}`}>
                          {getSourceLabel(review.source)}
                        </span>
                      </td>
                      <td>{formatReviewDate(review.createdAt)}</td>
                      <td>
                        <Link className="ghost-link compact-link" to={`/reviews/${review.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <section className="connect-card dashboard-connect-card">
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
              Link the account you use for source control so repository reviews can
              arrive here after pushes.
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

async function readReviewStream(
  body: ReadableStream<Uint8Array>,
  onReview: () => void,
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
      const hasReview = parseReviewEvent(frame);

      if (hasReview) {
        onReview();
      }
    }
  }
}

function parseReviewEvent(frame: string) {
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

  JSON.parse(data);
  return true;
}

function formatAverageScore(score: number) {
  return `${score.toFixed(1)}/10`;
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
