const rows = [
  { generic: "Loose response", product: "Senior verdict" },
  { generic: "Mixed advice", product: "Severity-ranked findings" },
  { generic: "Maybe this helps", product: "Fix before ship" },
  { generic: "Hard to revisit", product: "Saved review report" },
];

export function ComparisonSection() {
  return (
    <section className="landing-section comparison-section">
      <div>
        <p className="eyebrow">Generic chat vs DevMind report</p>
        <h2>One talks. One reviews.</h2>
      </div>
      <div className="comparison-table">
        <div>
          <strong>Generic chat</strong>
          <strong>DevMind report</strong>
        </div>
        {rows.map((row) => (
          <div key={row.generic}>
            <span>{row.generic}</span>
            <span>{row.product}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
