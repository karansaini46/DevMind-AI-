import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { API_URL, parseApiError } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "other", label: "Other" },
] as const;

type Language = (typeof languages)[number]["value"];

export function CodeReviewPage() {
  const token = useAuthStore((state) => state.token);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("typescript");
  const [filename, setFilename] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const extensions = useMemo(() => {
    switch (language) {
      case "javascript":
        return [javascript()];
      case "typescript":
        return [javascript({ typescript: true })];
      case "python":
        return [python()];
      case "go":
        return [go()];
      case "rust":
        return [rust()];
      default:
        return [];
    }
  }, [language]);

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
    setCopied(false);
    setIsSaved(false);
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
    setCopied(true);
  }

  return (
    <main className="review-shell">
      <header className="navbar">
        <div>
          <p className="eyebrow">DevMind</p>
          <strong>Code review</strong>
        </div>

        <Link className="ghost-link" to="/dashboard">
          Back to dashboard
        </Link>
      </header>

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
        </form>

        <section className="review-output">
          <div className="review-output-header">
            <div>
              <p className="eyebrow">Review</p>
              <h2>{markdown ? "Feedback" : "Waiting for code"}</h2>
            </div>

            {markdown && !isStreaming && !error ? (
              <div className="review-actions">
                <button className="ghost-button" type="button" onClick={() => void handleCopy()}>
                  {copied ? "Copied" : "Copy Review"}
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
        </section>
      </section>
    </main>
  );
}

async function readReviewStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onChunk: (chunk: string) => void;
    onDone: () => void;
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

  return {
    type: "message" as const,
    chunk: JSON.parse(data) as string,
  };
}
