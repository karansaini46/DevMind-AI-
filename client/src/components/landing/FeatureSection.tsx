const features = [
  "Brutal code reviews",
  "Production risk scoring",
  "GitHub review monitoring",
  "Security and performance checks",
  "Saved review history",
  "Semantic search across snippets",
];

export function FeatureSection() {
  return (
    <section className="landing-section">
      <div>
        <p className="eyebrow">What it does</p>
        <h2>Generated code is easy. Shipping reliable code is not.</h2>
      </div>
      <div className="feature-grid">
        {features.map((feature) => (
          <article key={feature}>
            <span />
            <h3>{feature}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
