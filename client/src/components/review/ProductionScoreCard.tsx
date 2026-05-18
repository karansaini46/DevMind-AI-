import { getVerdict, toProductionScore } from "../../lib/reviews";
import { ReviewVerdictBadge } from "./ReviewVerdictBadge";

export function ProductionScoreCard({ score }: { score: number }) {
  const productionScore = toProductionScore(score);
  const verdict = getVerdict(productionScore);

  return (
    <section className="production-score-card">
      <p className="eyebrow">Production Risk</p>
      <div>
        <strong>{productionScore}</strong>
        <span>/100</span>
      </div>
      <ReviewVerdictBadge verdict={verdict} />
    </section>
  );
}
