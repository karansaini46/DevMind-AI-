import type { ReviewSource } from "./api";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

export function formatReviewDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function getSourceLabel(source: ReviewSource) {
  return source === "webhook" ? "GitHub" : "Manual";
}

export function getScoreTone(score: number) {
  if (score >= 7) {
    return "is-good";
  }

  if (score >= 4) {
    return "is-mid";
  }

  return "is-low";
}
