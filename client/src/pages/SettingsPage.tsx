import { Link } from "react-router-dom";
import {
  goals,
  labelForValue,
  readOnboardingPreferences,
  reviewStyles,
  roles,
} from "../lib/onboarding";

export function SettingsPage() {
  const preferences = readOnboardingPreferences();

  return (
    <section className="settings-page">
      <section className="page-hero-card">
        <p className="eyebrow">Settings</p>
        <h1>Workspace defaults</h1>
        <p>Keep the cockpit sharp, honest, and tuned to how you work.</p>
      </section>

      <section className="dashboard-panel settings-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Review posture</p>
            <h2>Local preferences</h2>
          </div>
          <Link className="ghost-link" to="/onboarding">
            Reconfigure
          </Link>
        </div>
        <dl className="settings-list">
          <div>
            <dt>Role</dt>
            <dd>{labelForValue(roles, preferences.role)}</dd>
          </div>
          <div>
            <dt>Review style</dt>
            <dd>{labelForValue(reviewStyles, preferences.reviewStyle)}</dd>
          </div>
          <div>
            <dt>Main goal</dt>
            <dd>{labelForValue(goals, preferences.goal)}</dd>
          </div>
        </dl>
      </section>

      <section className="dashboard-panel settings-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Repository access</p>
            <h2>GitHub monitoring</h2>
          </div>
          <Link className="ghost-link" to="/github">
            Manage
          </Link>
        </div>
        <p>Account connection and repository monitoring now live in the GitHub setup area.</p>
      </section>
    </section>
  );
}
