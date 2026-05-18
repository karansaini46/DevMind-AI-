import type { ReviewMode } from "./api";

export const roles = [
  { value: "vibe-coder", label: "Vibe coder" },
  { value: "junior-developer", label: "Junior developer" },
  { value: "indie-hacker", label: "Indie hacker" },
  { value: "team-lead", label: "Team lead" },
] as const;

export const reviewStyles = [
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "brutal", label: "Brutal" },
] as const;

export const goals = [
  { value: "catch-bugs", label: "Catch bugs" },
  { value: "improve-quality", label: "Improve code quality" },
  { value: "learn-faster", label: "Learn faster" },
  { value: "review-pull-requests", label: "Review pull requests" },
] as const;

export type Role = (typeof roles)[number]["value"];
export type ReviewStyle = (typeof reviewStyles)[number]["value"];
export type Goal = (typeof goals)[number]["value"];

export interface OnboardingPreferences {
  role: Role;
  reviewStyle: ReviewStyle;
  goal: Goal;
  completed: boolean;
}

const STORAGE_KEY = "devmind-onboarding";

const defaultPreferences: OnboardingPreferences = {
  role: "indie-hacker",
  reviewStyle: "direct",
  goal: "catch-bugs",
  completed: false,
};

export function readOnboardingPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return defaultPreferences;
  }

  try {
    return {
      ...defaultPreferences,
      ...(JSON.parse(rawValue) as Partial<OnboardingPreferences>),
    };
  } catch {
    return defaultPreferences;
  }
}

export function saveOnboardingPreferences(preferences: OnboardingPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function hasCompletedOnboarding() {
  return readOnboardingPreferences().completed;
}

export function getPreferredReviewMode(): ReviewMode {
  const { reviewStyle } = readOnboardingPreferences();

  if (reviewStyle === "friendly") {
    return "beginner";
  }

  if (reviewStyle === "brutal") {
    return "strict";
  }

  return "production";
}

export function labelForValue<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
