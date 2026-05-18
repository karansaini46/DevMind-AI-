import type { DisplayIssue } from "../../lib/reviews";

export function IssueCard({ issue }: { issue: DisplayIssue }) {
  return (
    <article className="issue-card">
      <div className="issue-card-header">
        <span className={`severity-pill severity-${issue.severity.toLowerCase()}`}>
          {issue.severity}
        </span>
        <span>{issue.category}</span>
      </div>
      <h3>{issue.title}</h3>
      {issue.location ? <p className="issue-location">{issue.location}</p> : null}
      <div>
        <strong>Why it matters</strong>
        <p>{issue.whyItMatters}</p>
      </div>
      <div>
        <strong>Exact fix</strong>
        <p>{issue.fix}</p>
      </div>
    </article>
  );
}
