import {
  contextRules,
  languageRules,
  type ReviewContextTag,
} from "./languageRules";
import { reviewModeRules } from "./reviewModes";
import { antiHallucinationRules } from "./antiHallucinationRules";
import { baseReviewerPrompt } from "./baseReviewerPrompt";
import { outputSchemaPrompt } from "./outputSchema";
import { scoringRubric } from "./scoringRubric";
import type {
  ReviewLanguage,
  ReviewMode,
} from "../reviews/schema";

export interface ReviewPromptInput {
  code: string;
  filename: string;
  language: ReviewLanguage;
  mode: ReviewMode;
  contexts: ReviewContextTag[];
}

export function buildReviewSystemPrompt(input: Pick<ReviewPromptInput, "language" | "mode" | "contexts">) {
  return [
    baseReviewerPrompt,
    reviewModeRules[input.mode],
    languageRules[input.language],
    ...input.contexts.map((context) => contextRules[context]),
    scoringRubric,
    antiHallucinationRules,
    outputSchemaPrompt,
  ].join("\n\n");
}

export function buildReviewUserPrompt(input: ReviewPromptInput) {
  return [
    `Review this ${input.language} code.`,
    `Filename: ${input.filename}`,
    `Selected mode: ${input.mode}`,
    "",
    `\`\`\`${input.language}`,
    input.code,
    "```",
  ].join("\n");
}
