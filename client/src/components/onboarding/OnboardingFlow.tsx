import { useState } from "react";
import {
  goals,
  reviewStyles,
  roles,
  saveOnboardingPreferences,
  type Goal,
  type ReviewStyle,
  type Role,
} from "../../lib/onboarding";

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("indie-hacker");
  const [reviewStyle, setReviewStyle] = useState<ReviewStyle>("direct");
  const [goal, setGoal] = useState<Goal>("catch-bugs");

  function handleComplete() {
    saveOnboardingPreferences({ role, reviewStyle, goal, completed: true });
    onComplete();
  }

  return (
    <section className="onboarding-card">
      <div className="onboarding-progress" aria-label="Onboarding progress">
        {[0, 1, 2, 3].map((item) => (
          <span className={item <= step ? "is-active" : ""} key={item} />
        ))}
      </div>

      {step === 0 ? (
        <ChoiceStep
          eyebrow="Step 1"
          title="Who are you building as?"
          options={roles}
          value={role}
          onChange={(value) => setRole(value as Role)}
        />
      ) : null}

      {step === 1 ? (
        <ChoiceStep
          eyebrow="Step 2"
          title="How hard should the review land?"
          options={reviewStyles}
          value={reviewStyle}
          onChange={(value) => setReviewStyle(value as ReviewStyle)}
        />
      ) : null}

      {step === 2 ? (
        <ChoiceStep
          eyebrow="Step 3"
          title="What should DevMind help you do first?"
          options={goals}
          value={goal}
          onChange={(value) => setGoal(value as Goal)}
        />
      ) : null}

      {step === 3 ? (
        <div className="onboarding-final">
          <p className="eyebrow">Step 4</p>
          <h1>Your cockpit is ready.</h1>
          <p>Paste code. Get the production truth.</p>
        </div>
      ) : null}

      <div className="onboarding-actions">
        {step > 0 ? (
          <button className="ghost-button" type="button" onClick={() => setStep((value) => value - 1)}>
            Back
          </button>
        ) : null}
        {step < 3 ? (
          <button className="primary-button" type="button" onClick={() => setStep((value) => value + 1)}>
            Continue
          </button>
        ) : (
          <button className="primary-button danger-button" type="button" onClick={handleComplete}>
            Start first review
          </button>
        )}
      </div>
    </section>
  );
}

function ChoiceStep({
  eyebrow,
  title,
  options,
  value,
  onChange,
}: {
  eyebrow: string;
  title: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="choice-step">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div>
        {options.map((option) => (
          <button
            className={value === option.value ? "is-active" : ""}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
