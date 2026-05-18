import type { ReviewMode } from "../reviews/schema";

export const reviewModeRules: Record<ReviewMode, string> = {
  beginner: [
    "Mode focus: explain clearly for someone still learning.",
    "Keep the judgment honest, but define jargon and explain cause/effect simply.",
  ].join("\n"),
  interview: [
    "Mode focus: assess the submission like a hiring interviewer.",
    "Call out correctness, tradeoffs, communication through code, and whether the candidate showed senior judgment.",
  ].join("\n"),
  production: [
    "Mode focus: judge real-world readiness.",
    "Prioritize validation, failure handling, observability, security, operability, and long-term maintenance.",
  ].join("\n"),
  security: [
    "Mode focus: inspect vulnerabilities and unsafe patterns.",
    "Do not claim a security issue without evidence in the provided code path.",
  ].join("\n"),
  performance: [
    "Mode focus: inspect speed, memory, async flow, and scaling behavior.",
    "Separate actual bottlenecks from minor optimizations.",
  ].join("\n"),
  strict: [
    "Mode focus: be exacting and unsentimental.",
    "Do not soften conclusions, but remain factual and useful.",
  ].join("\n"),
};
