import type { ChangeEvent, FormEvent } from "react";
import type { Extension } from "@uiw/react-codemirror";
import { Link } from "react-router-dom";
import type { ManualReviewSummary, ReviewMode } from "../../lib/api";
import type { Language } from "../../lib/code-editor";
import { EmptyState } from "../EmptyState";
import { RecentReviewCard } from "../RecentReviewCard";
import { CodeInputPanel } from "./CodeInputPanel";
import { RiskMeter } from "./RiskMeter";

const inputModes = [
  { label: "Paste Code", available: true },
  { label: "GitHub PR", available: false },
  { label: "Repository Scan", available: false },
  { label: "Saved Snippet", available: false },
] as const;

export function ReviewCockpit({
  code,
  filename,
  language,
  mode,
  extensions,
  isReviewing,
  error,
  indexingWarning,
  history,
  historyError,
  isLoadingHistory,
  onSubmit,
  onCodeChange,
  onFilenameChange,
  onLanguageChange,
  onModeChange,
  onFileChange,
}: {
  code: string;
  filename: string;
  language: Language;
  mode: ReviewMode;
  extensions: Extension[];
  isReviewing: boolean;
  error: string | null;
  indexingWarning: string | null;
  history: ManualReviewSummary[];
  historyError: string | null;
  isLoadingHistory: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCodeChange: (value: string) => void;
  onFilenameChange: (value: string) => void;
  onLanguageChange: (value: Language) => void;
  onModeChange: (value: ReviewMode) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  return (
    <section className="review-cockpit">
      <div className="cockpit-heading">
        <div>
          <p className="eyebrow">Review Cockpit</p>
          <h1>What are we reviewing today?</h1>
          <p>This code compiles. That does not mean it survives production.</p>
        </div>

        <div className="input-mode-switcher" role="tablist" aria-label="Input mode">
          {inputModes.map((inputMode) => (
            <button
              className={inputMode.available ? "is-active" : ""}
              disabled={!inputMode.available}
              key={inputMode.label}
              type="button"
            >
              {inputMode.label}
              {!inputMode.available ? <small>Soon</small> : null}
            </button>
          ))}
        </div>
      </div>

      <form className="cockpit-grid" onSubmit={(event) => void onSubmit(event)}>
        <CodeInputPanel
          code={code}
          filename={filename}
          language={language}
          mode={mode}
          extensions={extensions}
          isReviewing={isReviewing}
          onCodeChange={onCodeChange}
          onFilenameChange={onFilenameChange}
          onLanguageChange={onLanguageChange}
          onModeChange={onModeChange}
          onFileChange={onFileChange}
        />

        <aside className="cockpit-rail">
          <RiskMeter hasCode={Boolean(code.trim())} />
          <button className="primary-button danger-button" type="submit" disabled={isReviewing}>
            {isReviewing ? "Reviewing..." : "Run Brutal Review"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {indexingWarning ? <p className="form-note">{indexingWarning}</p> : null}
        </aside>
      </form>

      <section className="history-strip">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Recent Reviews</p>
            <h2>Last passes</h2>
          </div>
          <Link className="ghost-link" to="/snippets">
            View snippets
          </Link>
        </div>

        {isLoadingHistory ? <div className="skeleton-row" aria-label="Loading reviews" /> : null}
        {historyError ? <p className="form-error">{historyError}</p> : null}

        {history.length ? (
          <div className="recent-review-grid">
            {history.slice(0, 4).map((item) => (
              <RecentReviewCard key={item.id} review={item} />
            ))}
          </div>
        ) : !isLoadingHistory ? (
          <EmptyState
            eyebrow="Empty cockpit"
            title="No reviews yet. Your bugs are still hiding."
            body="Paste your code. DevMind will tell you what your ego will not."
          />
        ) : null}
      </section>
    </section>
  );
}
