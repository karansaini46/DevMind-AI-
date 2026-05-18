import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

    let isMounted = true;

    async function loadSnippet() {
      try {
        const response = await fetch(`${API_URL}/snippets/${snippetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { snippet: Snippet };

        if (isMounted) {
          setSnippet(body.snippet);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error ? caughtError.message : "Unable to load snippet",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSnippet();

    return () => {
      isMounted = false;
    };
  }, [snippetId, token]);

  const extensions = useMemo(
    () => getLanguageExtensions(snippet?.language ?? "other"),
    [snippet?.language],
  );

  return (
    <section className="snippet-page">
      <div className="snippet-header">
        <div>
          <p className="eyebrow">Snippet</p>
          <h1>{snippet?.filename ?? "Loading snippet"}</h1>
        </div>
        <Link className="ghost-link" to="/search">
          Back to search
        </Link>
      </div>

      {isLoading ? <p className="empty-review">Loading snippet.</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {snippet ? (
        <div className="editor-shell">
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
