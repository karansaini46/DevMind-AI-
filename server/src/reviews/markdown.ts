import type {
  BugFinding,
  ReviewFinding,
  ReviewResult,
} from "./schema";

const actionLabels = {
  keep_as_is: "Keep as-is",
  improve_before_production: "Improve before production",
  rewrite_specific_parts: "Rewrite specific parts",
} as const;

export function renderReviewMarkdown(review: ReviewResult) {
  return [
    section("Quick Verdict", review.quickVerdict),
    section(
      "Scores",
      [
        `- Demo/Snippet Score: ${review.scores.demoScore.toFixed(1)}/10`,
        `- Production Score: ${review.scores.productionScore.toFixed(1)}/10`,
        `- Confidence Level: ${review.scores.confidenceLevel}`,
      ].join("\n"),
    ),
    section("What The Code Does", review.whatTheCodeDoes),
    section("Bugs Found", renderBugFindings(review.bugsFound)),
    section("Type Safety Issues", renderBugFindings(review.typeSafetyIssues)),
    section("Security Review", renderReviewFindings(review.securityReview)),
    section("Performance Review", renderReviewFindings(review.performanceReview)),
    section("Edge Cases Missing", renderReviewFindings(review.edgeCasesMissing)),
    section(
      "Code Quality & Maintainability",
      [
        review.codeQualityMaintainability.summary,
        renderReviewFindings(review.codeQualityMaintainability.findings),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
    section(
      "Test Coverage Suggestions",
      review.testCoverageSuggestions.length
        ? review.testCoverageSuggestions.map((item) => `- ${item}`).join("\n")
        : "No additional tests are warranted from the shown code.",
    ),
    section("Can This Fail In Production?", [
      review.canThisFailInProduction.summary,
      renderReviewFindings(review.canThisFailInProduction.risks),
    ]
      .filter(Boolean)
      .join("\n\n")),
    section(
      "What Would A Senior Engineer Change?",
      renderReviewFindings(review.whatWouldASeniorEngineerChange),
    ),
    section(
      "What Would Break At Scale?",
      renderReviewFindings(review.whatWouldBreakAtScale),
    ),
    section("Beginner Explanation", review.beginnerExplanation),
    section("Before / After", renderBeforeAfter(review)),
    section("Refactored Code", renderRefactoredCode(review)),
    section(
      "Final Recommendation",
      [
        `${actionLabels[review.finalRecommendation.action]} — ${review.finalRecommendation.summary}`,
        review.finalRecommendation.nextSteps.length
          ? review.finalRecommendation.nextSteps.map((item) => `- ${item}`).join("\n")
          : "- No next steps required.",
      ].join("\n\n"),
    ),
  ].join("\n\n");
}

function section(title: string, body: string) {
  return `## ${title}\n\n${body}`;
}

function renderBugFindings(findings: BugFinding[]) {
  if (!findings.length) {
    return "No confirmed issues found in the shown code path.";
  }

  return findings
    .map(
      (finding) => [
        `### [${finding.severity}] ${finding.issue}`,
        `- Why it happens: ${finding.whyItHappens}`,
        `- Exact location/pattern: ${finding.location}`,
        `- How to fix it: ${finding.fix}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function renderReviewFindings(findings: ReviewFinding[]) {
  if (!findings.length) {
    return "No material issues found from the provided code.";
  }

  return findings
    .map(
      (finding) => [
        `### [${finding.severity}] ${finding.issue}`,
        `- Evidence: ${finding.evidence}`,
        `- Recommendation: ${finding.recommendation}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function renderRefactoredCode(review: ReviewResult) {
  if (!review.refactoredCode.needed) {
    return review.refactoredCode.rationale;
  }

  return [
    review.refactoredCode.rationale,
    `\`\`\`${review.refactoredCode.language}`,
    review.refactoredCode.code,
    "```",
  ].join("\n\n");
}

function renderBeforeAfter(review: ReviewResult) {
  if (!review.beforeAfter.before.length && !review.beforeAfter.after.length) {
    return "No meaningful rewrite comparison is needed.";
  }

  return [
    "### Before",
    review.beforeAfter.before.length
      ? review.beforeAfter.before.map((item) => `- ${item}`).join("\n")
      : "- No material before-state notes.",
    "### After",
    review.beforeAfter.after.length
      ? review.beforeAfter.after.map((item) => `- ${item}`).join("\n")
      : "- No material after-state notes.",
  ].join("\n\n");
}
