import { RiskBadge } from "../RiskBadge";
import type { Verdict } from "../../lib/reviews";

export function ReviewVerdictBadge({ verdict }: { verdict: Verdict }) {
  return <RiskBadge label={verdict} />;
}
