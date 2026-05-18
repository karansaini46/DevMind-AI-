import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { API_URL, parseApiError, type ManualReviewSummary } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function SnippetsPage() {
  const token = useAuthStore((state) => state.token);
  const [reviews, setReviews] = useState<ManualReviewSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function loadSnippets() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/reviews/history?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { reviews: ManualReviewSummary[] };

        if (active) {
          setReviews(body.reviews);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load snippets");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSnippets();

    return () => {
      active = false;
    };
  }, [token]);

  const snippets = useMemo(() => {
    const seen = new Set<string>();
    return reviews.filter((review) => {
      if (seen.has(review.snippetId)) {
        return false;
      }

      seen.add(review.snippetId);
      return true;
    });
  }, [reviews]);

  return (
    <section className="snippets-page">
      <section className="page-hero-card">
        <p className="eyebrow">Snippets</p>
        <h1>Saved code from completed reviews.</h1>
        <p>Every reviewed snippet becomes something you can revisit, inspect, and search by meaning.</p>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <div className="skeleton-stack" aria-label="Loading snippets" /> : null}

      {snippets.length ? (
        <div className="snippet-grid">
          {snippets.map((snippet) => (
            <article className="snippet-card" key={snippet.snippetId}>
              <div>
                <span>{snippet.language}</span>
                <h2>{snippet.filename}</h2>
              </div>
              <p>
                Production {formatStoredScore(snippet.productionScore, snippet.score)} · Demo{" "}
                {formatStoredScore(snippet.demoScore, snippet.score)}
              </p>
              <div>
                <Link className="ghost-link" to={`/snippets/${snippet.snippetId}`}>
                  Open snippet
                </Link>
                <Link className="ghost-link" to={`/reviews/${snippet.id}`}>
                  Open report
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : !isLoading ? (
        <EmptyState
          eyebrow="No snippets"
          title="Nothing saved yet."
          body="Finish a review and the snippet will land here automatically."
          action={
            <Link className="primary-link" to="/review">
              Start a review
            </Link>
          }
        />
      ) : null}
    </section>
  );
}

function formatStoredScore(value: number | null, fallback: number) {
  return `${(value ?? fallback).toFixed(1)}/10`;
}
