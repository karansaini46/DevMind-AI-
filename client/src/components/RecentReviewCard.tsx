import { Link } from "react-router-dom";
import type { ManualReviewSummary } from "../lib/api";

export function RecentReviewCard({ review }: { review: ManualReviewSummary }) {
  return (
    <Link className="recent-review-card" to={`/reviews/${review.id}`}>
      <div>
        <strong>{review.filename}</strong>
        <span>{formatMode(review.mode)}</span>
      </div>
      <p>
        Production {formatStoredScore(review.productionScore, review.score)} · Demo{" "}
        {formatStoredScore(review.demoScore, review.score)}
      </p>
      <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
    </Link>
  );
}

function formatStoredScore(value: number | null, fallback: number) {
  return `${(value ?? fallback).toFixed(1)}/10`;
}

function formatMode(mode: string | null) {
  return mode ? `${mode[0].toUpperCase()}${mode.slice(1)}` : "Legacy";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
