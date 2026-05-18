export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  githubId: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SearchResult {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
  createdAt: string;
  content: string;
  distance: number;
}

export interface Snippet {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
  createdAt: string;
}

export type Severity = "Critical" | "High" | "Medium" | "Low" | "Nitpick";
export type ConfidenceLevel = "Low" | "Medium" | "High";
export type ReviewMode =
  | "beginner"
  | "interview"
  | "production"
  | "security"
  | "performance"
  | "strict";

export interface BugFinding {
  severity: Severity;
  issue: string;
  whyItHappens: string;
  location: string;
  fix: string;
}

export interface ReviewFinding {
  severity: Severity;
  issue: string;
  evidence: string;
  recommendation: string;
}

export interface ReviewResult {
  quickVerdict: string;
  scores: {
    demoScore: number;
    productionScore: number;
    confidenceLevel: ConfidenceLevel;
  };
  whatTheCodeDoes: string;
  bugsFound: BugFinding[];
  typeSafetyIssues: BugFinding[];
  securityReview: ReviewFinding[];
  performanceReview: ReviewFinding[];
  edgeCasesMissing: ReviewFinding[];
  codeQualityMaintainability: {
    summary: string;
    findings: ReviewFinding[];
  };
  testCoverageSuggestions: string[];
  refactoredCode: {
    needed: boolean;
    rationale: string;
    language: string;
    code: string;
  };
  canThisFailInProduction: {
    summary: string;
    risks: ReviewFinding[];
  };
  whatWouldASeniorEngineerChange: ReviewFinding[];
  whatWouldBreakAtScale: ReviewFinding[];
  beginnerExplanation: string;
  beforeAfter: {
    before: string[];
    after: string[];
  };
  finalRecommendation: {
    action: "keep_as_is" | "improve_before_production" | "rewrite_specific_parts";
    summary: string;
    nextSteps: string[];
  };
}

export interface ReviewUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ReviewResponse {
  reviewId: string;
  snippetId: string;
  filename: string;
  language: string;
  review: ReviewResult;
  markdown: string;
  usage: ReviewUsage;
  searchIndexed: boolean;
}

export interface ManualReviewSummary {
  id: string;
  snippetId: string;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  createdAt: string;
  filename: string;
  language: string;
}

export interface ManualReviewDetail {
  id: string;
  snippetId: string;
  markdown: string;
  review: ReviewResult | null;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  usage: ReviewUsage;
  createdAt: string;
  filename: string;
  language: string;
  code: string;
}

export interface AutoReview {
  id: string;
  snippetId: string;
  markdown: string;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  createdAt: string;
  source: "webhook";
  filename: string;
  language: string;
}

export async function parseApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return body?.message ?? "Something went wrong";
}
