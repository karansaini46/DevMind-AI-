import { Link } from "react-router-dom";
import { RiskBadge } from "../RiskBadge";
import { useAuthStore } from "../../store/auth-store";

const findings = [
  {
    label: "Critical",
    title: "Payment failure path is ignored",
    fix: "Verify the charge result before saving the order.",
  },
  {
    label: "Warning",
    title: "Retry path has no test coverage",
    fix: "Add failure and duplicate-submit coverage before release.",
  },
] as const;

export function LandingHero() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <section className="review-simulation">
      <div className="simulation-heading">
        <div>
          <p className="eyebrow">Review Simulation</p>
          <h1>Ship code that survives production.</h1>
        </div>
        <Link className="primary-link danger-link" to={isAuthenticated ? "/review" : "/register"}>
          Run brutal review
        </Link>
      </div>

      <div className="simulation-frame">
        <section className="simulation-code">
          <div className="simulation-bar">
            <span />
            <strong>checkout.ts</strong>
          </div>
          <pre>
            <code>{`async function ship(order) {
  await charge(order.total)
  return save(order)
}`}</code>
          </pre>
        </section>

        <aside className="simulation-verdict">
          <div>
            <span>Production Score</span>
            <strong>72</strong>
          </div>
          <RiskBadge label="Fix First" />
          <p>Senior Verdict: this compiles. That does not mean it survives.</p>
        </aside>

        <section className="simulation-findings">
          {findings.map((finding) => (
            <article key={finding.title}>
              <RiskBadge label={finding.label} />
              <h2>{finding.title}</h2>
              <p>{finding.fix}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
