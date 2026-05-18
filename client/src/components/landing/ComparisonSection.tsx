const rows = [
  { generic: "Open chat box", product: "Review cockpit" },
  { generic: "Loose paragraphs", product: "Severity-ranked findings" },
  { generic: "Feels agreeable", product: "Gives a verdict" },
  { generic: "Hard to revisit", product: "Saved reports and snippets" },
];

export function ComparisonSection() {
  return (
    <section className="landing-section comparison-section">
      <div>
        <p className="eyebrow">Difference</p>
        <h2>Generic chat vs DevMind</h2>
      </div>
      <div className="comparison-table">
        <div>
          <strong>Generic chat</strong>
          <strong>DevMind</strong>
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
