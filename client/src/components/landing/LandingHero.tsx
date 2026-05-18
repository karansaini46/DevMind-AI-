import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";

export function LandingHero() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <section className="landing-hero">
      <div className="landing-copy">
        <p className="eyebrow">Production-first code review</p>
        <h1>Ship code that survives production.</h1>
        <p>
          DevMind gives you the verdict a brutal senior engineer would give before a real
          pull request ever reaches users.
        </p>
        <div className="landing-actions">
          <Link className="primary-link danger-link" to={isAuthenticated ? "/review" : "/register"}>
            Run your first brutal review
          </Link>
          <Link className="ghost-link" to={isAuthenticated ? "/dashboard" : "/login"}>
            {isAuthenticated ? "Open workspace" : "Sign in"}
          </Link>
        </div>
      </div>

      <div className="cockpit-mock" aria-hidden="true">
        <div className="mock-window-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="mock-grid">
          <aside>
            <strong>Production Risk</strong>
            <em>72</em>
            <small>Fix First</small>
          </aside>
          <section>
            <code>async function ship(order) &#123;</code>
            <code>  await charge(order.total)</code>
            <code>  return save(order)</code>
            <code>&#125;</code>
          </section>
        </div>
        <div className="mock-findings">
          <span>Critical · Missing failure handling</span>
          <span>Major · Payment result not verified</span>
          <span>Minor · No test path for retries</span>
        </div>
      </div>
    </section>
  );
}
