import { useNavigate } from "react-router-dom";
import { OnboardingFlow } from "../components/onboarding/OnboardingFlow";

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <main className="onboarding-shell">
      <OnboardingFlow onComplete={() => navigate("/review", { replace: true })} />
    </main>
  );
}
