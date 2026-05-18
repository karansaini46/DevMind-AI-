import { embedAndStore } from "../embeddings/service";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { createStructuredReview, type ReviewInput } from "./chains";
import { renderReviewMarkdown } from "./markdown";
import type {
  ReviewResult,
  ReviewUsage,
} from "./schema";

export async function createSnippet(userId: string, input: ReviewInput) {
  return prisma.codeSnippet.create({
    data: {
      userId,
      filename: input.filename,
      language: input.language,
      rawCode: input.code,
    },
  });
}

export async function createStoredReview(input: {
  snippetId: string;
  userId: string;
  markdown: string;
  review: ReviewResult;
  usage: ReviewUsage;
  mode: ReviewInput["mode"];
  source?: "manual" | "webhook";
}) {
  return prisma.review.create({
    data: {
      snippetId: input.snippetId,
      userId: input.userId,
      feedbackMarkdown: input.markdown,
      score: Math.round(input.review.scores.productionScore),
      structuredFeedback: input.review,
      demoScore: input.review.scores.demoScore,
      productionScore: input.review.scores.productionScore,
      confidenceLevel: input.review.scores.confidenceLevel,
      mode: input.mode,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens,
      ...(input.source ? { source: input.source } : {}),
    },
  });
}

export async function createCompletedReview(input: ReviewInput) {
  try {
    const { review, usage } = await createStructuredReview(input);
    const markdown = renderReviewMarkdown(review);

    return { markdown, review, usage };
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new AppError("Too many requests, wait a moment", 429);
    }

    throw error;
  }
}

export async function indexSnippet(snippetId: string, code: string) {
  try {
    await embedAndStore(snippetId, code);
    return true;
  } catch (error) {
    console.error(`Unable to index snippet ${snippetId}`, error);
    return false;
  }
}

export function isRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    status?: number;
    statusCode?: number;
    message?: string;
    response?: { status?: number };
  };

  return (
    candidate.status === 429 ||
    candidate.statusCode === 429 ||
    candidate.response?.status === 429 ||
    candidate.message?.includes("429") === true ||
    candidate.message?.includes("RESOURCE_EXHAUSTED") === true
  );
}
