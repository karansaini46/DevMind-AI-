import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  API_URL,
  parseApiError,
  type BugFinding,
  type ManualReviewDetail,
  type ManualReviewSummary,
  type ReviewFinding,
  type ReviewMode,
  type ReviewResponse,
  type ReviewResult,
  type ReviewUsage,
  type Severity,
} from "../lib/api";
import {
  getEditorLanguage,
  getLanguageExtensions,
  languages,
  type Language,
} from "../lib/code-editor";
import { useAuthStore } from "../store/auth-store";

const reviewModes: Array<{ value: ReviewMode; label: string; summary: string }> = [
  { value: "production", label: "Production", summary: "Real-world readiness" },
  { value: "beginner", label: "Beginner", summary: "Simple explanations" },
  { value: "interview", label: "Interview", summary: "Hiring signal" },
  { value: "security", label: "Security", summary: "Vulnerability focus" },
  { value: "performance", label: "Performance", summary: "Speed and scale" },
  { value: "strict", label: "Strict", summary: "Hard judgment" },
];

const actionLabels = {
  keep_as_is: "Keep as-is",
  improve_before_production: "Improve before production",
  rewrite_specific_parts: "Rewrite specific parts",
} as const;

export function CodeReviewPage() {
  const token = useAuthStore((state) => state.token);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("auto");
  const [filename, setFilename] = useState("");
  const [mode, setMode] = useState<ReviewMode>("production");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [usage, setUsage] = useState<ReviewUsage>({});
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showBeginnerExplanation, setShowBeginnerExplanation] = useState(false);
  const [indexingWarning, setIndexingWarning] = useState<string | null>(null);
  const [history, setHistory] = useState<ManualReviewSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [loadingReviewId, setLoadingReviewId] = useState<string | null>(null);

  const editorLanguage = getEditorLanguage(language, filename);
  const extensions = useMemo(
    () => getLanguageExtensions(editorLanguage),
    [editorLanguage],
  );

  useEffect(() => {
    if (!token) {
      setIsLoadingHistory(false);
      return;
    }

    let active = true;

    async function loadHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await fetch(`${API_URL}/reviews/history?limit=12`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { reviews: ManualReviewSummary[] };

        if (active) {
          setHistory(body.reviews);
        }
      } catch (caughtError) {
        if (active) {
          setHistoryError(
            caughtError instanceof Error ? caughtError.message : "Unable to load review history",
          );
        }
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [token]);

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
    setReview(null);
    setMarkdown("");
    setUsage({});
    setReviewId(null);
    setCopiedReview(false);
    setCopiedCode(false);
    setIsSaved(false);
    setIndexingWarning(null);
    setIsReviewing(true);

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ code, language, filename, mode }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as ReviewResponse;
      setReview(body.review);
      setMarkdown(body.markdown);
      setUsage(body.usage);
      setReviewId(body.reviewId);
      setFilename((current) => current || body.filename);
      setIsSaved(true);
      setShowBeginnerExplanation(false);

      if (!body.searchIndexed) {
        setIndexingWarning("Saved, but search indexing is pending.");
      }

      setHistory((current) => [
        {
          id: body.reviewId,
          snippetId: body.snippetId,
          score: Math.round(body.review.scores.productionScore),
          demoScore: body.review.scores.demoScore,
          productionScore: body.review.scores.productionScore,
          confidenceLevel: body.review.scores.confidenceLevel,
          mode,
          createdAt: new Date().toISOString(),
          filename: body.filename,
          language: body.language,
        },
        ...current.filter((item) => item.id !== body.reviewId),
      ].slice(0, 12));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to complete review",
      );
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleLoadHistoryItem(item: ManualReviewSummary) {
    if (!token) {
      return;
    }

    setLoadingReviewId(item.id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/reviews/${item.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as { review: ManualReviewDetail };
      setCode(body.review.code);
      setFilename(body.review.filename);
      setLanguage(toLanguage(body.review.language));
      setMode(toMode(body.review.mode));
      setMarkdown(body.review.markdown);
      setReview(body.review.review);
      setUsage(body.review.usage);
      setReviewId(body.review.id);
      setIsSaved(true);
      setCopiedReview(false);
      setCopiedCode(false);
      setShowBeginnerExplanation(false);
      setIndexingWarning(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load review",
      );
    } finally {
      setLoadingReviewId(null);
    }
  }

  async function handleCopyReview() {
    await navigator.clipboard.writeText(markdown);
    setCopiedReview(true);
  }

  async function handleCopyImprovedCode() {
    if (!review?.refactoredCode.code) {
      return;
    }

    await navigator.clipboard.writeText(review.refactoredCode.code);
    setCopiedCode(true);
  }

  function handleExport() {
    if (!markdown) {
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportBaseName(filename)}-review.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setCode(text);
    setFilename(file.name);
    setLanguage("auto");
    event.target.value = "";
  }

  return (
    <section className="review-page">
      <section className="review-layout">
        <form className="review-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="review-form-header">
            <div>
              <p className="eyebrow">Input</p>
              <h1>Review your code.</h1>
            </div>
            <button className="primary-button" type="submit" disabled={isReviewing}>
              {isReviewing ? "Reviewing..." : "Review My Code"}
            </button>
          </div>

          <div className="review-fields review-fields-wide">
            <label>
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ReviewMode)}
                disabled={isReviewing}
              >
                {reviewModes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.summary}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Language
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                disabled={isReviewing}
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
                disabled={isReviewing}
              />
            </label>
          </div>

          <label className="file-upload">
            Upload file
            <input type="file" onChange={(event) => void handleFileChange(event)} disabled={isReviewing} />
          </label>

          <div className="editor-shell">
            <CodeMirror
              value={code}
              height="28rem"
              extensions={extensions}
              onChange={setCode}
              editable={!isReviewing}
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

        <aside className="history-panel">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent reviews</h2>
          </div>

          {isLoadingHistory ? <p className="empty-review">Loading history.</p> : null}
          {historyError ? <p className="form-error">{historyError}</p> : null}

          {history.length ? (
            <div className="history-list">
              {history.map((item) => (
                <button
                  className={item.id === reviewId ? "history-item is-active" : "history-item"}
                  key={item.id}
                  type="button"
                  onClick={() => void handleLoadHistoryItem(item)}
                  disabled={loadingReviewId === item.id}
                >
                  <strong>{item.filename}</strong>
                  <span>{formatMode(item.mode)}</span>
                  <small>
                    Production {formatStoredScore(item.productionScore, item.score)} · Demo {formatStoredScore(item.demoScore, item.score)}
                  </small>
                </button>
              ))}
            </div>
          ) : !isLoadingHistory ? (
            <p className="empty-review">Completed reviews will collect here.</p>
          ) : null}
        </aside>
      </section>

      <section className="review-output">
        <div className="review-output-header">
          <div>
            <p className="eyebrow">Review</p>
            <h2>{review ? "Feedback" : markdown ? "Saved feedback" : "Waiting for code"}</h2>
          </div>

          {markdown && !isReviewing && !error ? (
            <div className="review-actions">
              <button className="ghost-button" type="button" onClick={() => void handleCopyReview()}>
                {copiedReview ? "Copied" : "Copy Review"}
              </button>
              <button className="ghost-button" type="button" onClick={handleExport}>
                Export Markdown
              </button>
              <button className="ghost-button" type="button" disabled>
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          ) : null}
        </div>

        {review ? (
          <StructuredReview
            review={review}
            usage={usage}
            copiedCode={copiedCode}
            showBeginnerExplanation={showBeginnerExplanation}
            onCopyImprovedCode={handleCopyImprovedCode}
            onToggleBeginnerExplanation={() =>
              setShowBeginnerExplanation((current) => !current)
            }
          />
        ) : markdown ? (
          <article className="legacy-review">
            <p>This saved review predates the structured report format.</p>
            <pre>{markdown}</pre>
          </article>
        ) : (
          <p className="empty-review">
            Paste a snippet or upload a file, and the report will appear here when it is complete.
          </p>
        )}
      </section>
    </section>
  );
}

function StructuredReview({
  review,
  usage,
  copiedCode,
  showBeginnerExplanation,
  onCopyImprovedCode,
  onToggleBeginnerExplanation,
}: {
  review: ReviewResult;
  usage: ReviewUsage;
  copiedCode: boolean;
  showBeginnerExplanation: boolean;
  onCopyImprovedCode: () => Promise<void>;
  onToggleBeginnerExplanation: () => void;
}) {
  return (
    <div className="structured-review">
      <section className="verdict-card">
        <p>{review.quickVerdict}</p>
        <div className="score-row">
          <ScoreCard label="Demo / Snippet" value={review.scores.demoScore} />
          <ScoreCard label="Production" value={review.scores.productionScore} />
          <div className="score-card">
            <span>Confidence</span>
            <strong>{review.scores.confidenceLevel}</strong>
          </div>
        </div>
        {hasUsage(usage) ? (
          <div className="usage-row">
            <span>Input {usage.inputTokens ?? "—"}</span>
            <span>Output {usage.outputTokens ?? "—"}</span>
            <span>Total {usage.totalTokens ?? "—"}</span>
          </div>
        ) : null}
      </section>

      <ReviewSection title="What The Code Does">
        <p>{review.whatTheCodeDoes}</p>
      </ReviewSection>

      <ReviewSection title="Bugs Found">
        <BugFindingList findings={review.bugsFound} empty="No confirmed bugs found in the shown code path." />
      </ReviewSection>

      <ReviewSection title="Type Safety Issues">
        <BugFindingList findings={review.typeSafetyIssues} empty="No material type-safety issues found." />
      </ReviewSection>

      <ReviewSection title="Security Review">
        <FindingList findings={review.securityReview} empty="No material security issues found from the provided code." />
      </ReviewSection>

      <ReviewSection title="Performance Review">
        <FindingList findings={review.performanceReview} empty="No material performance issues found from the provided code." />
      </ReviewSection>

      <ReviewSection title="Edge Cases Missing">
        <FindingList findings={review.edgeCasesMissing} empty="No realistic missing edge cases were identified." />
      </ReviewSection>

      <ReviewSection title="Code Quality & Maintainability">
        <p>{review.codeQualityMaintainability.summary}</p>
        <FindingList findings={review.codeQualityMaintainability.findings} empty="No material maintainability issues found." />
      </ReviewSection>

      <ReviewSection title="Test Coverage Suggestions">
        <BulletList items={review.testCoverageSuggestions} empty="No additional tests are warranted from the shown code." />
      </ReviewSection>

      <ReviewSection title="Can This Fail In Production?">
        <p>{review.canThisFailInProduction.summary}</p>
        <FindingList findings={review.canThisFailInProduction.risks} empty="No material production risks found from the shown code." />
      </ReviewSection>

      <ReviewSection title="What Would A Senior Engineer Change?">
        <FindingList findings={review.whatWouldASeniorEngineerChange} empty="No material changes beyond current implementation." />
      </ReviewSection>

      <ReviewSection title="What Would Break At Scale?">
        <FindingList findings={review.whatWouldBreakAtScale} empty="No scale-specific breakage identified from the shown code." />
      </ReviewSection>

      <ReviewSection title="Beginner Explanation">
        <button className="inline-toggle" type="button" onClick={onToggleBeginnerExplanation}>
          {showBeginnerExplanation ? "Hide explanation" : "Show explanation"}
        </button>
        {showBeginnerExplanation ? <p>{review.beginnerExplanation}</p> : null}
      </ReviewSection>

      {review.refactoredCode.needed ? (
        <ReviewSection title="Before / After">
          <div className="before-after-grid">
            <div>
              <h3>Before</h3>
              <BulletList items={review.beforeAfter.before} empty="No summary available." />
            </div>
            <div>
              <h3>After</h3>
              <BulletList items={review.beforeAfter.after} empty="No summary available." />
            </div>
          </div>
        </ReviewSection>
      ) : null}

      <ReviewSection title="Refactored Code">
        <p>{review.refactoredCode.rationale}</p>
        {review.refactoredCode.needed ? (
          <>
            <div className="code-block-header">
              <span>{review.refactoredCode.language}</span>
              <button className="ghost-button" type="button" onClick={() => void onCopyImprovedCode()}>
                {copiedCode ? "Copied" : "Copy Code"}
              </button>
            </div>
            <pre className="improved-code"><code>{review.refactoredCode.code}</code></pre>
          </>
        ) : null}
      </ReviewSection>

      <ReviewSection title="Final Recommendation">
        <p>
          <strong>{actionLabels[review.finalRecommendation.action]}:</strong>{" "}
          {review.finalRecommendation.summary}
        </p>
        <BulletList items={review.finalRecommendation.nextSteps} empty="No further action required." />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="review-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-card">
      <span>{label}</span>
      <strong>{value.toFixed(1)}/10</strong>
    </div>
  );
}

function BugFindingList({ findings, empty }: { findings: BugFinding[]; empty: string }) {
  if (!findings.length) {
    return <p className="empty-inline">{empty}</p>;
  }

  return (
    <div className="finding-list">
      {findings.map((finding) => (
        <article className="finding-card" key={`${finding.issue}-${finding.location}`}>
          <SeverityBadge severity={finding.severity} />
          <h4>{finding.issue}</h4>
          <p><strong>Why it happens:</strong> {finding.whyItHappens}</p>
          <p><strong>Exact location/pattern:</strong> {finding.location}</p>
          <p><strong>How to fix it:</strong> {finding.fix}</p>
        </article>
      ))}
    </div>
  );
}

function FindingList({ findings, empty }: { findings: ReviewFinding[]; empty: string }) {
  if (!findings.length) {
    return <p className="empty-inline">{empty}</p>;
  }

  return (
    <div className="finding-list">
      {findings.map((finding) => (
        <article className="finding-card" key={`${finding.issue}-${finding.evidence}`}>
          <SeverityBadge severity={finding.severity} />
          <h4>{finding.issue}</h4>
          <p><strong>Evidence:</strong> {finding.evidence}</p>
          <p><strong>Recommendation:</strong> {finding.recommendation}</p>
        </article>
      ))}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity-badge severity-${severity.toLowerCase()}`}>{severity}</span>;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return <p className="empty-inline">{empty}</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function hasUsage(usage: ReviewUsage) {
  return Boolean(usage.inputTokens || usage.outputTokens || usage.totalTokens);
}

function formatStoredScore(value: number | null, fallback: number) {
  return `${(value ?? fallback).toFixed(1)}/10`;
}

function formatMode(mode: string | null) {
  return mode ? `${mode[0].toUpperCase()}${mode.slice(1)}` : "Legacy";
}

function toMode(mode: string | null): ReviewMode {
  return reviewModes.some((candidate) => candidate.value === mode)
    ? (mode as ReviewMode)
    : "production";
}

function toLanguage(language: string): Language {
  return languages.some((candidate) => candidate.value === language)
    ? (language as Language)
    : "auto";
}

function exportBaseName(filename: string) {
  return (filename || "code").replace(/\.[^.]+$/, "");
}
