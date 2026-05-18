import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { API_URL, parseApiError, type Snippet } from "../lib/api";
import { getLanguageExtensions } from "../lib/code-editor";
import { useAuthStore } from "../store/auth-store";

export function SnippetDetailPage() {
  const token = useAuthStore((state) => state.token);
  const { snippetId } = useParams();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !snippetId) {
      setError("Snippet is unavailable");
      setIsLoading(false);
      return;
    }

    let active = true;

    async function loadSnippet() {
      try {
        const response = await fetch(`${API_URL}/snippets/${snippetId}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { snippet: Snippet };

        if (active) {
          setSnippet(body.snippet);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load snippet");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSnippet();

    return () => {
      active = false;
    };
  }, [snippetId, token]);

  const extensions = useMemo(
    () => getLanguageExtensions(snippet?.language ?? "other"),
    [snippet?.language],
  );

  if (error) {
    return <EmptyState title="Snippet unavailable." body={error} />;
  }

  return (
    <section className="snippet-page">
      <div className="snippet-header">
        <div>
          <p className="eyebrow">Snippet</p>
          <h1>{snippet?.filename ?? "Loading snippet"}</h1>
        </div>
        <Link className="ghost-link" to="/snippets">
          Back to snippets
        </Link>
      </div>

      {isLoading ? <div className="report-skeleton" aria-label="Loading snippet" /> : null}

      {snippet ? (
        <div className="editor-shell snippet-editor">
          <CodeMirror
            value={snippet.rawCode}
            height="32rem"
            extensions={extensions}
            editable={false}
            basicSetup={{
              foldGutter: true,
              lineNumbers: true,
              highlightActiveLine: false,
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
