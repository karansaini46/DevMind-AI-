import {
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "../prompts/buildReviewPrompt";
import type { ReviewContextTag } from "../prompts/languageRules";
import { getReviewModel } from "./client";
import {
  reviewResultSchema,
  type ReviewLanguage,
  type ReviewMode,
  type ReviewResult,
  type ReviewUsage,
} from "./schema";

export interface ReviewInput {
  code: string;
  language: ReviewLanguage;
  filename: string;
  mode: ReviewMode;
  contexts: ReviewContextTag[];
}

export async function createStructuredReview(input: ReviewInput) {
  const structuredModel = getReviewModel().withStructuredOutput(reviewResultSchema, {
    includeRaw: true,
  });
  const result = await structuredModel.invoke([
    new SystemMessage(buildReviewSystemPrompt(input)),
    new HumanMessage(buildReviewUserPrompt(input)),
  ]);
  const review = reviewResultSchema.parse(result.parsed);

  return {
    review,
    usage: extractUsage(result.raw),
  } satisfies {
    review: ReviewResult;
    usage: ReviewUsage;
  };
}

function extractUsage(raw: unknown): ReviewUsage {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const candidate = raw as {
    usage_metadata?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };

  return {
    ...(typeof candidate.usage_metadata?.input_tokens === "number"
      ? { inputTokens: candidate.usage_metadata.input_tokens }
      : {}),
    ...(typeof candidate.usage_metadata?.output_tokens === "number"
      ? { outputTokens: candidate.usage_metadata.output_tokens }
      : {}),
    ...(typeof candidate.usage_metadata?.total_tokens === "number"
      ? { totalTokens: candidate.usage_metadata.total_tokens }
      : {}),
  };
}
