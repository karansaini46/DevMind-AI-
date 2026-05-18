import type { ReviewResult } from "../../reviews/schema";

export const cleanTypeScriptSnippet = `export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}`;

export const poorTypeScriptSnippet = `function getUserName(user: any) {
  return user.profile.name.toUpperCase();
}`;

export const insecureJavaScriptSnippet = `export function run(input) {
  return eval(input);
}`;

export const asyncApiWithoutHandlingSnippet = `export async function loadUser(id: string) {
  const response = await fetch('/users/' + id);
  return response.json();
}`;

export const reactAccessibilitySnippet = `export function IconButton() {
  return <div onClick={() => submit()}><svg /></div>;
}`;

export const pythonEdgeCaseSnippet = `def average(values):
    return sum(values) / len(values)
`;

export const backendMissingValidationSnippet = `router.post('/users', async (request, response) => {
  const user = await prisma.user.create({ data: request.body });
  response.json(user);
});`;

export const sampleReviewResult: ReviewResult = {
  quickVerdict: "Fine for a demo, but not ready for production without validation and failure handling.",
  scores: {
    demoScore: 8.5,
    productionScore: 5.0,
    confidenceLevel: "High",
  },
  whatTheCodeDoes: "It loads a user record and returns the decoded response body.",
  bugsFound: [],
  typeSafetyIssues: [],
  securityReview: [],
  performanceReview: [],
  edgeCasesMissing: [
    {
      severity: "Medium",
      issue: "Missing failed-response handling",
      evidence: "The code reads response.json() without checking response.ok.",
      recommendation: "Check the response status before reading the body and return a structured error.",
    },
  ],
  codeQualityMaintainability: {
    summary: "The function is small and readable, but the error contract is implicit.",
    findings: [],
  },
  testCoverageSuggestions: [
    "Successful response returns parsed data",
    "Non-2xx response returns a controlled error",
  ],
  refactoredCode: {
    needed: true,
    rationale: "A short rewrite adds explicit response handling without changing the shape of the code.",
    language: "typescript",
    code: "export async function loadUser(id: string) {\n  const response = await fetch(`/users/${id}`);\n\n  if (!response.ok) {\n    throw new Error(`Request failed with ${response.status}`);\n  }\n\n  return response.json();\n}",
  },
  canThisFailInProduction: {
    summary: "Yes. A failed request is currently treated like a successful one.",
    risks: [],
  },
  whatWouldASeniorEngineerChange: [],
  whatWouldBreakAtScale: [],
  beginnerExplanation: "The function assumes every request succeeds, so it needs a check before using the response.",
  beforeAfter: {
    before: ["Assumes every request succeeds"],
    after: ["Checks failed responses before parsing"],
  },
  finalRecommendation: {
    action: "improve_before_production",
    summary: "Add explicit failure handling before shipping this path.",
    nextSteps: ["Check response.ok before parsing JSON"],
  },
};
