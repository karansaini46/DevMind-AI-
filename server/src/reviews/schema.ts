import { z } from "zod";

export const reviewModes = [
  "beginner",
  "interview",
  "production",
  "security",
  "performance",
  "strict",
] as const;

export const severityLevels = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Nitpick",
] as const;

export const confidenceLevels = ["Low", "Medium", "High"] as const;

export const supportedReviewLanguages = [
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
  "cpp",
  "other",
] as const;

export const reviewLanguageInputs = [
  "auto",
  ...supportedReviewLanguages,
] as const;

const scoreSchema = z
  .number()
  .min(0)
  .max(10)
  .refine((value) => Number.isInteger(value * 10), {
    message: "Scores must use at most one decimal place",
  });

export const severitySchema = z.enum(severityLevels);
export const reviewModeSchema = z.enum(reviewModes);
export const confidenceSchema = z.enum(confidenceLevels);
export const reviewLanguageSchema = z.enum(supportedReviewLanguages);
export const reviewLanguageInputSchema = z.enum(reviewLanguageInputs);

export const bugFindingSchema = z.object({
  severity: severitySchema,
  issue: z.string(),
  whyItHappens: z.string(),
  location: z.string(),
  fix: z.string(),
});

export const reviewFindingSchema = z.object({
  severity: severitySchema,
  issue: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
});

export const reviewResultSchema = z.object({
  quickVerdict: z.string(),
  scores: z.object({
    demoScore: scoreSchema,
    productionScore: scoreSchema,
    confidenceLevel: confidenceSchema,
  }),
  whatTheCodeDoes: z.string(),
  bugsFound: z.array(bugFindingSchema),
  typeSafetyIssues: z.array(bugFindingSchema),
  securityReview: z.array(reviewFindingSchema),
  performanceReview: z.array(reviewFindingSchema),
  edgeCasesMissing: z.array(reviewFindingSchema),
  codeQualityMaintainability: z.object({
    summary: z.string(),
    findings: z.array(reviewFindingSchema),
  }),
  testCoverageSuggestions: z.array(z.string()),
  refactoredCode: z.object({
    needed: z.boolean(),
    rationale: z.string(),
    language: z.string(),
    code: z.string(),
  }),
  canThisFailInProduction: z.object({
    summary: z.string(),
    risks: z.array(reviewFindingSchema),
  }),
  whatWouldASeniorEngineerChange: z.array(reviewFindingSchema),
  whatWouldBreakAtScale: z.array(reviewFindingSchema),
  beginnerExplanation: z.string(),
  beforeAfter: z.object({
    before: z.array(z.string()),
    after: z.array(z.string()),
  }),
  finalRecommendation: z.object({
    action: z.enum([
      "keep_as_is",
      "improve_before_production",
      "rewrite_specific_parts",
    ]),
    summary: z.string(),
    nextSteps: z.array(z.string()),
  }),
});

export type ReviewMode = z.infer<typeof reviewModeSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type ReviewLanguage = z.infer<typeof reviewLanguageSchema>;
export type ReviewLanguageInput = z.infer<typeof reviewLanguageInputSchema>;
export type BugFinding = z.infer<typeof bugFindingSchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;

export interface ReviewUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}
