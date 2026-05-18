import { RiskBadge } from "../RiskBadge";

const previewSignals = ["Security", "Bugs", "Maintainability", "Performance", "Tests"];

export function RiskMeter({ hasCode }: { hasCode: boolean }) {
  return (
    <section className="risk-meter">
      <div className="cockpit-step-heading compact">
        <span>03</span>
        <div>
          <p className="eyebrow">Receive verdict</p>
          <h2>{hasCode ? "Ready to judge" : "Awaiting code"}</h2>
        </div>
      </div>

      <div className="risk-scale-list compact">
        <RiskBadge label="Stable" />
        <RiskBadge label="Warning" />
        <RiskBadge label="Risky" />
        <RiskBadge label="Critical" />
      </div>

      <div className="signal-list">
        {previewSignals.map((signal) => (
          <div key={signal}>
            <span>{signal}</span>
            <strong>Pending</strong>
          </div>
        ))}
      </div>

      <p>
        {hasCode
          ? "Run the review to turn guesswork into a senior verdict."
          : "Paste code. Get the senior verdict."}
      </p>
    </section>
  );
}
