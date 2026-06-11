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
          <img src="/logo.png" alt="DevMind AI" className="brand-logo" />
          <strong>DevMind</strong>
        </div>
        <nav>
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
          <p className="eyebrow">Review Boundary</p>
          <h2>Fix before you ship.</h2>
          <p>Pasted reviews and repository watch are separate actions. Nothing starts watching pushes until you connect one.</p>
        </div>
        <Link className="primary-link danger-link" to="/register">
          Run brutal review
        </Link>
      </section>
    </main>
  );
}
