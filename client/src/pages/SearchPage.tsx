import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  API_URL,
  parseApiError,
  type SearchResult,
} from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function SearchPage() {
  const token = useAuthStore((state) => state.token);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setError("Search query is required");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setError(null);
    setHasSearched(true);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { results: SearchResult[] };
      setResults(body.results);
    } catch (caughtError) {
      setResults([]);
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to search snippets",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="search-page">
      <div className="search-card">
        <p className="eyebrow">Search</p>
        <h1>Find code by meaning.</h1>
        <form className="search-form" onSubmit={(event) => void handleSubmit(event)}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your code by meaning... e.g. 'error handling middleware'"
          />
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((result) => (
            <Link className="search-result-card" key={result.id} to={`/snippets/${result.id}`}>
              <div className="search-result-header">
                <div>
                  <h2>{result.filename}</h2>
                  <span className="language-badge">{result.language}</span>
                </div>
                <strong>{formatScore(result.distance)}</strong>
              </div>

              <pre className="search-preview">{result.content}</pre>
            </Link>
          ))}
        </div>
      ) : hasSearched && !isLoading && !error ? (
        <section className="empty-state">
          <h2>No matching code found.</h2>
          <p>Try reviewing some code first.</p>
        </section>
      ) : null}
    </section>
  );
}

function formatScore(distance: number) {
  const score = Math.max(0, Math.min(100, (1 - distance) * 100));
  return `${Math.round(score)}%`;
}
