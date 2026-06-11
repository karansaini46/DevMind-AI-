const before = [
  "Looks fine at a glance",
  "Loose notes buried in chat",
  "No clear shipping call",
];

const after = [
  "Exact failure points surfaced",
  "Severity-ranked report",
  "One senior verdict before release",
  "Automated commit comments",
];

export function BeforeAfterSection() {
  return (
    <section className="landing-section before-after-section">
      <div>
        <p className="eyebrow">Before / After</p>
        <h2>From vague confidence to shipping judgment.</h2>
      </div>

      <div className="before-after-board">
        <article>
          <span>Before DevMind</span>
          <ul>
            {before.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <span>After DevMind</span>
          <ul>
            {after.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
