import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { DocumentationPanel } from "../components/DocumentationPanel";
import {
  API_URL,
  parseApiError,
  type Documentation,
} from "../lib/api";
import {
  getLanguageExtensions,
  languages,
  type Language,
} from "../lib/code-editor";
import { useAuthStore } from "../store/auth-store";

export function CodeReviewPage() {
  const token = useAuthStore((state) => state.token);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("typescript");
  const [filename, setFilename] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);
  const [indexingWarning, setIndexingWarning] = useState<string | null>(null);
  const [snippetId, setSnippetId] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"review" | "documentation">(
    "review",
  );
  const [activeDocumentationTab, setActiveDocumentationTab] = useState<
    "commentedCode" | "readmeSection"
  >("commentedCode");
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [documentationError, setDocumentationError] = useState<string | null>(null);
  const [hasLoadedDocumentation, setHasLoadedDocumentation] = useState(false);
  const [isLoadingDocumentation, setIsLoadingDocumentation] = useState(false);
  const [isGeneratingDocumentation, setIsGeneratingDocumentation] = useState(false);
  const [copiedCommentedCode, setCopiedCommentedCode] = useState(false);
  const [copiedReadmeSection, setCopiedReadmeSection] = useState(false);

  const extensions = useMemo(() => getLanguageExtensions(language), [language]);
  const documentationExtensions = useMemo(
    () => getLanguageExtensions(documentation?.language.toLowerCase() ?? "other"),
    [documentation?.language],
  );

  useEffect(() => {
    if (
      activeResultTab !== "documentation" ||
      !token ||
      !snippetId ||
      hasLoadedDocumentation
    ) {
      return;
    }

    let isMounted = true;

    async function loadDocumentation() {
      setIsLoadingDocumentation(true);
      setDocumentationError(null);

      try {
        const response = await fetch(`${API_URL}/docs/${snippetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (response.status === 404) {
          if (isMounted) {
            setHasLoadedDocumentation(true);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as Documentation;

        if (isMounted) {
          setDocumentation(body);
          setHasLoadedDocumentation(true);
        }
      } catch (caughtError) {
        if (isMounted) {
          setDocumentationError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load documentation",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocumentation(false);
        }
      }
    }

    void loadDocumentation();

    return () => {
      isMounted = false;
    };
  }, [activeResultTab, hasLoadedDocumentation, snippetId, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim()) {
      setError("Code is required");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setError(null);
    setMarkdown("");
    setCopiedReview(false);
    setIsSaved(false);
    setIndexingWarning(null);
    setSnippetId(null);
    setActiveResultTab("review");
    setActiveDocumentationTab("commentedCode");
    setDocumentation(null);
    setDocumentationError(null);
    setHasLoadedDocumentation(false);
    setCopiedCommentedCode(false);
    setCopiedReadmeSection(false);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_URL}/reviews/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ code, language, filename }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      if (!response.body) {
        throw new Error("Review stream is unavailable");
      }

      await readReviewStream(response.body, {
        onChunk(chunk) {
          setMarkdown((current) => current + chunk);
        },
        onDone() {
          setIsSaved(true);
        },
        onIndexing(searchIndexed) {
          if (!searchIndexed) {
            setIndexingWarning("Saved, but search indexing is pending.");
          }
        },
        onSnippet(nextSnippetId) {
          setSnippetId(nextSnippetId);
        },
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to complete review",
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopiedReview(true);
  }

  async function handleGenerateDocumentation() {
    if (!token || !snippetId) {
      setDocumentationError("Save a review before generating documentation");
      return;
    }

    setDocumentationError(null);
    setCopiedCommentedCode(false);
    setCopiedReadmeSection(false);
    setIsGeneratingDocumentation(true);

    try {
      const response = await fetch(`${API_URL}/docs/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ snippetId }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as Documentation;
      setDocumentation(body);
      setHasLoadedDocumentation(true);
    } catch (caughtError) {
      setDocumentationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate documentation",
      );
    } finally {
      setIsGeneratingDocumentation(false);
    }
  }

  async function handleCopyCommentedCode() {
    if (!documentation) {
      return;
    }

    await navigator.clipboard.writeText(documentation.commentedCode);
    setCopiedCommentedCode(true);
  }

  async function handleCopyReadmeSection() {
    if (!documentation) {
      return;
    }

    await navigator.clipboard.writeText(documentation.readmeSection);
    setCopiedReadmeSection(true);
  }

  return (
    <section className="review-page">
      <section className="review-grid">
        <form className="review-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="review-form-header">
            <div>
              <p className="eyebrow">Input</p>
              <h1>Review your code.</h1>
            </div>
            <button className="primary-button" type="submit" disabled={isStreaming}>
              {isStreaming ? "Reviewing..." : "Review My Code"}
            </button>
          </div>

          <div className="review-fields">
            <label>
              Language
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                disabled={isStreaming}
              >
                {languages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Filename
              <input
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="optional"
                disabled={isStreaming}
              />
            </label>
          </div>

          <div className="editor-shell">
            <CodeMirror
              value={code}
              height="28rem"
              extensions={extensions}
              onChange={setCode}
              editable={!isStreaming}
              basicSetup={{
                foldGutter: true,
                lineNumbers: true,
                highlightActiveLine: true,
              }}
            />
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          {indexingWarning ? <p className="form-note">{indexingWarning}</p> : null}
        </form>

        <section className="review-output">
          <div className="result-tabs" role="tablist" aria-label="Results">
            <button
              className={activeResultTab === "review" ? "result-tab is-active" : "result-tab"}
              type="button"
              role="tab"
              aria-selected={activeResultTab === "review"}
              onClick={() => setActiveResultTab("review")}
            >
              Review
            </button>
            <button
              className={
                activeResultTab === "documentation"
                  ? "result-tab is-active"
                  : "result-tab"
              }
              type="button"
              role="tab"
              aria-selected={activeResultTab === "documentation"}
              onClick={() => setActiveResultTab("documentation")}
            >
              Documentation
            </button>
          </div>

          {activeResultTab === "review" ? (
            <>
              <div className="review-output-header">
                <div>
                  <p className="eyebrow">Review</p>
                  <h2>{markdown ? "Feedback" : "Waiting for code"}</h2>
                </div>

                {markdown && !isStreaming && !error ? (
                  <div className="review-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => void handleCopy()}
                    >
                      {copiedReview ? "Copied" : "Copy Review"}
                    </button>
                    <button className="ghost-button" type="button" disabled>
                      {isSaved ? "Saved" : "Save"}
                    </button>
                    <button className="ghost-button" type="button" disabled>
                      View History
                    </button>
                  </div>
                ) : null}
              </div>

              {markdown ? (
                <article className="markdown-output">
                  <ReactMarkdown>{markdown}</ReactMarkdown>
                  {isStreaming ? <span className="stream-cursor" aria-hidden="true" /> : null}
                </article>
              ) : (
                <p className="empty-review">
                  Paste a snippet on the left and the review will unfold here as it arrives.
                </p>
              )}
            </>
          ) : (
            <DocumentationPanel
              activeTab={activeDocumentationTab}
              documentation={documentation}
              documentationExtensions={documentationExtensions}
              error={documentationError}
              hasSnippet={Boolean(snippetId)}
              isGenerating={isGeneratingDocumentation}
              isLoading={isLoadingDocumentation}
              copiedCommentedCode={copiedCommentedCode}
              copiedReadmeSection={copiedReadmeSection}
              onGenerate={() => void handleGenerateDocumentation()}
              onTabChange={setActiveDocumentationTab}
              onCopyCommentedCode={() => void handleCopyCommentedCode()}
              onCopyReadmeSection={() => void handleCopyReadmeSection()}
            />
          )}
        </section>
      </section>
    </section>
  );
}

async function readReviewStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onChunk: (chunk: string) => void;
    onDone: () => void;
    onIndexing: (searchIndexed: boolean) => void;
    onSnippet: (snippetId: string) => void;
  },
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = parseEventFrame(frame);

      if (!event) {
        continue;
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }

      if (event.type === "done") {
        handlers.onDone();
        return;
      }

      if (event.type === "indexing") {
        handlers.onIndexing(event.searchIndexed);
        continue;
      }

      if (event.type === "snippet") {
        handlers.onSnippet(event.snippetId);
        continue;
      }

      handlers.onChunk(event.chunk);
    }
  }

  throw new Error("Review stream ended unexpectedly");
}

function parseEventFrame(frame: string) {
  const lines = frame.split(/\r?\n/);
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  if (data === "[DONE]") {
    return { type: "done" as const };
  }

  if (event === "error") {
    const parsed = JSON.parse(data) as { message?: string };
    return {
      type: "error" as const,
      message: parsed.message ?? "Unable to complete review",
    };
  }

  if (event === "indexing") {
    const parsed = JSON.parse(data) as { searchIndexed?: boolean };
    return {
      type: "indexing" as const,
      searchIndexed: parsed.searchIndexed === true,
    };
  }

  if (event === "snippet") {
    const parsed = JSON.parse(data) as { snippetId?: string };
    return {
      type: "snippet" as const,
      snippetId: parsed.snippetId ?? "",
    };
  }

  return {
    type: "message" as const,
    chunk: JSON.parse(data) as string,
  };
}
