import { Link } from "react-router-dom";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { FeatureSection } from "../components/landing/FeatureSection";
import { LandingHero } from "../components/landing/LandingHero";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="brand-lockup">
          <span />
          <strong>DevMind</strong>
        </div>
        <nav>
          <a href="#problem">Why it matters</a>
          <a href="#trust">Trust</a>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>

      <LandingHero />

      <section className="landing-section problem-section" id="problem">
        <p className="eyebrow">The problem</p>
        <h2>Looks clean. Still risky.</h2>
        <p>
          The code that embarrasses you in production usually passed a glance test first.
          DevMind is built for the gap between “it runs” and “it is safe to ship.”
        </p>
      </section>

      <FeatureSection />
      <ComparisonSection />

      <section className="landing-section trust-section" id="trust">
        <div>
          <p className="eyebrow">Trust</p>
          <h2>Your code stays tied to your workspace.</h2>
        </div>
        <div className="trust-grid">
          <article>
            <h3>Scoped access</h3>
            <p>Reviews and snippets are returned only inside the signed-in workspace.</p>
          </article>
          <article>
            <h3>Explicit repository setup</h3>
            <p>Repository monitoring starts only after you connect an account and choose a repo.</p>
          </article>
          <article>
            <h3>Disconnect when needed</h3>
            <p>Repository monitoring can be removed from the workspace settings at any time.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Fix before you ship.</h2>
        <Link className="primary-link danger-link" to="/register">
          Run your first brutal review
        </Link>
      </section>
    </main>
  );
}
