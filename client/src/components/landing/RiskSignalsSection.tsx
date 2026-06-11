import { RiskBadge } from "../RiskBadge";

const readinessRows = [
  { label: "Security", value: "Warning" },
  { label: "Bugs", value: "Critical" },
  { label: "Maintainability", value: "Stable" },
  { label: "Performance", value: "Warning" },
  { label: "Tests", value: "Risky" },
] as const;

export function RiskSignalsSection() {
  return (
    <section className="landing-section risk-signals-section" id="risk-signals">
      <div>
        <p className="eyebrow">Risk Signals</p>
        <h2>Production risk is the interface.</h2>
      </div>

      <div className="risk-language-grid">
        <article>
          <h3>Risk scale</h3>
          <div className="risk-scale-list">
            <RiskBadge label="Stable" />
            <RiskBadge label="Warning" />
            <RiskBadge label="Risky" />
            <RiskBadge label="Critical" />
          </div>
        </article>

        <article>
          <h3>Production readiness breakdown</h3>
          <div className="readiness-list">
            {readinessRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <RiskBadge label={row.value} />
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
