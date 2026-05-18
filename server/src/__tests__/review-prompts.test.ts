import { describe, expect, it } from "vitest";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "../prompts/buildReviewPrompt";
import { renderReviewMarkdown } from "../reviews/markdown";
import { resolveReviewContext } from "../reviews/language-detection";
import { reviewResultSchema } from "../reviews/schema";
import {
  backendMissingValidationSnippet,
  cleanTypeScriptSnippet,
  insecureJavaScriptSnippet,
  reactAccessibilitySnippet,
  sampleReviewResult,
} from "./fixtures/review-samples";

describe("review prompts", () => {
  it("combines mode, language, context, rubric, and accuracy rules", () => {
    const prompt = buildReviewSystemPrompt({
      language: "typescript",
      mode: "production",
      contexts: ["backend"],
    });

    expect(prompt).toContain("Mode focus: judge real-world readiness.");
    expect(prompt).toContain("TypeScript checks:");
    expect(prompt).toContain("Backend/API checks:");
    expect(prompt).toContain("Do not award a high production score");
    expect(prompt).toContain("Only call something a bug when it can actually fail");
  });

  it("keeps the source code and selected mode in the user prompt", () => {
    const prompt = buildReviewUserPrompt({
      code: cleanTypeScriptSnippet,
      filename: "sum.ts",
      language: "typescript",
      mode: "strict",
      contexts: [],
    });

    expect(prompt).toContain("Filename: sum.ts");
    expect(prompt).toContain("Selected mode: strict");
    expect(prompt).toContain(cleanTypeScriptSnippet);
  });
});

describe("review context detection", () => {
  it("detects JavaScript from direct evidence", () => {
    expect(
      resolveReviewContext({
        code: insecureJavaScriptSnippet,
        filename: "",
        language: "auto",
      }),
    ).toEqual({
      language: "javascript",
      contexts: [],
    });
  });

  it("adds React context when JSX is visible", () => {
    expect(
      resolveReviewContext({
        code: reactAccessibilitySnippet,
        filename: "icon-button.tsx",
        language: "auto",
      }),
    ).toEqual({
      language: "typescript",
      contexts: ["react"],
    });
  });

  it("adds backend context when route handling is visible", () => {
    expect(
      resolveReviewContext({
        code: backendMissingValidationSnippet,
        filename: "users.ts",
        language: "auto",
      }),
    ).toEqual({
      language: "typescript",
      contexts: ["backend"],
    });
  });
});

describe("review schema and markdown", () => {
  it("accepts structured review output with decimal scores", () => {
    expect(reviewResultSchema.parse(sampleReviewResult)).toEqual(sampleReviewResult);
  });

  it("renders dual scores and the required sections", () => {
    const markdown = renderReviewMarkdown(sampleReviewResult);

    expect(markdown).toContain("## Quick Verdict");
    expect(markdown).toContain("Demo/Snippet Score: 8.5/10");
    expect(markdown).toContain("Production Score: 5.0/10");
    expect(markdown).toContain("## Can This Fail In Production?");
    expect(markdown).toContain("## What Would A Senior Engineer Change?");
  });
});
