import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  languages,
  getLanguageLabel,
} from "../lib/code-editor";
import {
  type ReviewListResponse,
} from "../lib/api";
import { authConfig, apiClient, getRequestErrorMessage } from "../lib/http";
import {
  formatReviewDate,
  getScoreTone,
  getSourceLabel,
} from "../lib/review-display";
import { useAuthStore } from "../store/auth-store";

const pageSize = 20;

const sortOptions = [
  { value: "createdAt:desc", label: "Newest First" },
  { value: "createdAt:asc", label: "Oldest First" },
  { value: "score:desc", label: "Best Score" },
  { value: "score:asc", label: "Worst Score" },
] as const;

export function HistoryPage() {
  const token = useAuthStore((state) => state.token);
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState<ReviewListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const language = searchParams.get("language") ?? "";
  const source = searchParams.get("source") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const order = searchParams.get("order") ?? "desc";
  const sortValue = `${sortBy}:${order}`;

  useEffect(() => {
    if (!token) {
      return;
    }

    const currentToken = token;
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<ReviewListResponse>("/reviews", {
          ...authConfig(currentToken),
          params: {
            page,
            limit: pageSize,
            ...(language ? { language } : {}),
            ...(source ? { source } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            sortBy,
            order,
          },
        });

        if (isMounted) {
          setHistory(response.data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getRequestErrorMessage(caughtError, "Unable to load review history"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [from, language, order, page, sortBy, source, to, token]);

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(values)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }

    next.set("page", "1");
    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function changeSort(value: string) {
    const [nextSortBy, nextOrder] = value.split(":");
    updateFilters({
      sortBy: nextSortBy,
      order: nextOrder,
    });
  }

  return (
    <section className="history-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Review History</p>
          <h1>Every saved review.</h1>
        </div>
      </div>

      <section className="panel-card filter-card">
        <label>
          Language
          <select
            value={language}
            onChange={(event) => updateFilters({ language: event.target.value })}
          >
            <option value="">All languages</option>
            {languages.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Source
          <select
            value={source}
            onChange={(event) => updateFilters({ source: event.target.value })}
          >
            <option value="">All</option>
            <option value="manual">Manual</option>
            <option value="webhook">GitHub</option>
          </select>
        </label>

        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(event) => updateFilters({ from: event.target.value })}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(event) => updateFilters({ to: event.target.value })}
          />
        </label>

        <label>
          Sort
          <select value={sortValue} onChange={(event) => changeSort(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="empty-review">Loading review history.</p> : null}

      {history && history.reviews.length > 0 ? (
        <section className="panel-card table-card">
          <div className="table-wrap">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Language</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.reviews.map((review) => (
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
                      <div className="row-actions">
                        <Link className="ghost-link compact-link" to={`/reviews/${review.id}`}>
                          View Review
                        </Link>
                        <Link
                          className="ghost-link compact-link"
                          to={`/snippets/${review.snippet.id}`}
                        >
                          View Code
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="ghost-button"
              type="button"
              onClick={() => changePage(Math.max(1, history.page - 1))}
              disabled={history.page <= 1}
            >
              Previous
            </button>
            <span>
              Page {history.page} of {history.totalPages}
            </span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => changePage(Math.min(history.totalPages, history.page + 1))}
              disabled={history.page >= history.totalPages}
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      {history && history.reviews.length === 0 && !isLoading ? (
        <section className="empty-state">
          <h2>No reviews found.</h2>
          <p>Try widening the filters or create a new review.</p>
        </section>
      ) : null}
    </section>
  );
}
