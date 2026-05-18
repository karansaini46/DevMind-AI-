const anatomy = [
  {
    title: "Senior Verdict",
    body: "A direct call on whether the code is safe to ship, needs fixes, or should stop here.",
  },
  {
    title: "Hidden failure points",
    body: "Exact issues, severity, location, impact, and what breaks in production.",
  },
  {
    title: "Fix before ship",
    body: "Concrete next actions and improved code when the implementation needs surgery.",
  },
] as const;

export function ReviewAnatomySection() {
  return (
    <section className="landing-section anatomy-section" id="anatomy">
      <div>
        <p className="eyebrow">Review Anatomy</p>
        <h2>A report, not a conversation.</h2>
      </div>

      <div className="anatomy-rail">
        {anatomy.map((item, index) => (
          <article key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
