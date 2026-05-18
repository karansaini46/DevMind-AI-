import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { FixSuggestionBlock } from "../components/review/FixSuggestionBlock";
import { IssueCard } from "../components/review/IssueCard";
import { ProductionScoreCard } from "../components/review/ProductionScoreCard";
import { ReviewVerdictBadge } from "../components/review/ReviewVerdictBadge";
import { SeverityTabs } from "../components/review/SeverityTabs";
import {
  API_URL,
  parseApiError,
  type ManualReviewDetail,
  type ReviewResponse,
} from "../lib/api";
import {
  buildReviewIssues,
  countIssuesByGroup,
  getSeverityGroup,
  getVerdict,
  toProductionScore,
  type SeverityGroup,
} from "../lib/reviews";
import { useAuthStore } from "../store/auth-store";

interface LocationState {
  initialReview?: ReviewResponse;
}

export function ReviewResultPage() {
  const token = useAuthStore((state) => state.token);
  const { reviewId } = useParams();
  const location = useLocation();
  const initialReview = (location.state as LocationState | null)?.initialReview;
  const [detail, setDetail] = useState<ManualReviewDetail | null>(() =>
    initialReview ? toDetail(initialReview) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialReview);
  const [activeGroup, setActiveGroup] = useState<SeverityGroup>("Critical");

  useEffect(() => {
    if (!token || !reviewId || initialReview) {
      return;
    }

    let active = true;

    async function loadReview() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { review: ManualReviewDetail };

        if (active) {
          setDetail(body.review);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load review");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadReview();

    return () => {
      active = false;
    };
  }, [initialReview, reviewId, token]);

  const issues = useMemo(() => (detail?.review ? buildReviewIssues(detail.review) : []), [detail]);
  const counts = useMemo(() => countIssuesByGroup(issues), [issues]);
  const visibleIssues = issues.filter((issue) => getSeverityGroup(issue.severity) === activeGroup);
  const topIssues = issues.slice(0, 3);
  const productionScore = detail?.review
    ? toProductionScore(detail.review.scores.productionScore)
    : 0;
  const verdict = getVerdict(productionScore);

  useEffect(() => {
    if (counts[activeGroup] > 0 || !issues.length) {
      return;
    }

    const firstGroup = (Object.entries(counts) as Array<[SeverityGroup, number]>).find(
      ([, count]) => count > 0,
    )?.[0];

    if (firstGroup) {
      setActiveGroup(firstGroup);
    }
  }, [activeGroup, counts, issues.length]);

  if (isLoading) {
    return <div className="report-skeleton" aria-label="Loading review report" />;
  }

  if (error) {
    return (
      <EmptyState
        eyebrow="Review unavailable"
        title="The report could not be loaded."
        body={error}
        action={
          <Link className="primary-link" to="/review">
            Back to cockpit
          </Link>
        }
      />
    );
  }

  if (!detail?.review) {
    return (
      <EmptyState
        eyebrow="Legacy review"
        title="This report predates the structured format."
        body="Open a newer review to see the full senior-review report."
        action={
          <Link className="primary-link" to="/review">
            Start a new review
          </Link>
        }
      />
    );
  }

  return (
    <section className="review-report-page">
      <header className="report-hero">
        <div>
          <p className="eyebrow">Senior Engineer Verdict</p>
          <h1>{detail.filename}</h1>
          <p>{detail.review.quickVerdict}</p>
          <div className="report-meta">
            <ReviewVerdictBadge verdict={verdict} />
            <span>{detail.language}</span>
            <time dateTime={detail.createdAt}>{formatDate(detail.createdAt)}</time>
          </div>
        </div>
        <ProductionScoreCard score={detail.review.scores.productionScore} />
      </header>

      <section className="top-issues-panel report-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Top 3</p>
            <h2>Critical path issues</h2>
          </div>
        </div>
        {topIssues.length ? (
          <div className="top-issues-grid">
            {topIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <p className="empty-inline">No material findings in the provided code path.</p>
        )}
      </section>

      <section className="report-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Findings</p>
            <h2>Severity review</h2>
          </div>
        </div>
        <SeverityTabs activeGroup={activeGroup} counts={counts} onChange={setActiveGroup} />
        {visibleIssues.length ? (
          <div className="issue-list">
            {visibleIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <p className="empty-inline">Nothing in this band.</p>
        )}
      </section>

      <section className="report-grid">
        <ReportTextPanel
          eyebrow="Summary"
          title="Senior engineer summary"
          body={detail.review.finalRecommendation.summary}
        />
        <ReportTextPanel
          eyebrow="Production"
          title="What will break in production?"
          body={detail.review.canThisFailInProduction.summary}
        />
        <ReportListPanel
          eyebrow="Pull request"
          title="What would get rejected in a real PR?"
          items={detail.review.whatWouldASeniorEngineerChange.map((item) => item.issue)}
          empty="No rejection-level changes were identified."
        />
        <ReportListPanel
          eyebrow="Next actions"
          title="Fix before you ship"
          items={detail.review.finalRecommendation.nextSteps}
          empty="No further action required."
        />
      </section>

      <FixSuggestionBlock review={detail.review} />
    </section>
  );
}

function ReportTextPanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="report-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function ReportListPanel({
  eyebrow,
  title,
  items,
  empty,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="report-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function toDetail(response: ReviewResponse): ManualReviewDetail {
  return {
    id: response.reviewId,
    snippetId: response.snippetId,
    markdown: response.markdown,
    review: response.review,
    score: Math.round(response.review.scores.productionScore),
    demoScore: response.review.scores.demoScore,
    productionScore: response.review.scores.productionScore,
    confidenceLevel: response.review.scores.confidenceLevel,
    mode: null,
    usage: response.usage,
    createdAt: new Date().toISOString(),
    filename: response.filename,
    language: response.language,
    code: "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
