import { Link } from "react-router-dom";
import { BeforeAfterSection } from "../components/landing/BeforeAfterSection";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { LandingHero } from "../components/landing/LandingHero";
import { ReviewAnatomySection } from "../components/landing/ReviewAnatomySection";
import { RiskSignalsSection } from "../components/landing/RiskSignalsSection";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="brand-lockup">
          <span />
          <strong>DevMind</strong>
        </div>
        <nav>
          <a href="#anatomy">Review anatomy</a>
          <a href="#risk-signals">Risk signals</a>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>

      <LandingHero />
      <ReviewAnatomySection />
      <RiskSignalsSection />
      <BeforeAfterSection />
      <ComparisonSection />

      <section className="landing-cta">
        <div>
          <p className="eyebrow">Repository boundary</p>
          <h2>Fix before you ship.</h2>
          <p>Reviews stay in your workspace. Repository monitoring starts only after you connect one.</p>
        </div>
        <Link className="primary-link danger-link" to="/register">
          Run brutal review
        </Link>
      </section>
    </main>
  );
}
