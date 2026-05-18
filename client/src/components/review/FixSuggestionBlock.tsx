import { useState } from "react";
import type { ReviewResult } from "../../lib/api";

export function FixSuggestionBlock({ review }: { review: ReviewResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(review.refactoredCode.code);
    setCopied(true);
  }

  return (
    <section className="report-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Fix suggestion</p>
          <h2>Improved code</h2>
        </div>
      </div>
      <p>{review.refactoredCode.rationale}</p>

      {review.refactoredCode.needed ? (
        <>
          <div className="code-block-header">
            <span>{review.refactoredCode.language}</span>
            <button className="ghost-button" type="button" onClick={() => void handleCopy()}>
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <pre className="improved-code">
            <code>{review.refactoredCode.code}</code>
          </pre>
        </>
      ) : null}
    </section>
  );
}
