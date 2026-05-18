import type { BugFinding, ReviewFinding, ReviewResult, Severity } from "./api";

export type Verdict = "Ship It" | "Fix First" | "Risky" | "Do Not Ship";
export type SeverityGroup = "Critical" | "Major" | "Minor" | "Suggestions";

export interface DisplayIssue {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  location?: string;
  whyItMatters: string;
  fix: string;
}

export const severityGroups: SeverityGroup[] = [
  "Critical",
  "Major",
  "Minor",
  "Suggestions",
];

const severityRank: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Nitpick: 4,
};

export function toProductionScore(value: number) {
  return Math.round(value * 10);
}

export function getVerdict(score: number): Verdict {
  if (score >= 85) {
    return "Ship It";
  }

  if (score >= 70) {
    return "Fix First";
  }

  if (score >= 50) {
    return "Risky";
  }

  return "Do Not Ship";
}

export function getSeverityGroup(severity: Severity): SeverityGroup {
  if (severity === "Critical") {
    return "Critical";
  }

  if (severity === "High") {
    return "Major";
  }

  if (severity === "Nitpick") {
    return "Suggestions";
  }

  return "Minor";
}

export function buildReviewIssues(review: ReviewResult) {
  const issues: DisplayIssue[] = [];

  addBugFindings(issues, "Bugs", review.bugsFound);
  addBugFindings(issues, "Type safety", review.typeSafetyIssues);
  addReviewFindings(issues, "Security", review.securityReview);
  addReviewFindings(issues, "Performance", review.performanceReview);
  addReviewFindings(issues, "Edge cases", review.edgeCasesMissing);
  addReviewFindings(issues, "Maintainability", review.codeQualityMaintainability.findings);
  addReviewFindings(issues, "Production risk", review.canThisFailInProduction.risks);
  addReviewFindings(issues, "Senior review", review.whatWouldASeniorEngineerChange);
  addReviewFindings(issues, "Scale", review.whatWouldBreakAtScale);

  return issues.sort((left, right) => severityRank[left.severity] - severityRank[right.severity]);
}

export function countIssuesByGroup(issues: DisplayIssue[]) {
  return severityGroups.reduce<Record<SeverityGroup, number>>(
    (counts, group) => ({
      ...counts,
      [group]: issues.filter((issue) => getSeverityGroup(issue.severity) === group).length,
    }),
    {
      Critical: 0,
      Major: 0,
      Minor: 0,
      Suggestions: 0,
    },
  );
}

function addBugFindings(target: DisplayIssue[], category: string, findings: BugFinding[]) {
  findings.forEach((finding, index) => {
    target.push({
      id: `${category}-${index}-${finding.issue}`,
      category,
      title: finding.issue,
      severity: finding.severity,
      location: finding.location,
      whyItMatters: finding.whyItHappens,
      fix: finding.fix,
    });
  });
}

function addReviewFindings(
  target: DisplayIssue[],
  category: string,
  findings: ReviewFinding[],
) {
  findings.forEach((finding, index) => {
    target.push({
      id: `${category}-${index}-${finding.issue}`,
      category,
      title: finding.issue,
      severity: finding.severity,
      whyItMatters: finding.evidence,
      fix: finding.recommendation,
    });
  });
}
