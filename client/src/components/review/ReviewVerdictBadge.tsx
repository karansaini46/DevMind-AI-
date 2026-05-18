import type { Verdict } from "../../lib/reviews";

export function ReviewVerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`verdict-badge verdict-${toClassName(verdict)}`}>{verdict}</span>;
}

function toClassName(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
