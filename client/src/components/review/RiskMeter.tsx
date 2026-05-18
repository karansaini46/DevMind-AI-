const previewSignals = ["Security", "Bugs", "Maintainability", "Performance", "Tests"];

export function RiskMeter({ hasCode }: { hasCode: boolean }) {
  return (
    <section className="risk-meter">
      <div>
        <p className="eyebrow">Production Risk</p>
        <h2>{hasCode ? "Signals armed" : "Awaiting code"}</h2>
      </div>

      <div className="risk-dial" aria-hidden="true">
        <span>{hasCode ? "Ready" : "Idle"}</span>
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
          ? "DevMind scores real risk after the review runs. No theater before evidence."
          : "Paste code to arm the cockpit."}
      </p>
    </section>
  );
}
