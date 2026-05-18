import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { resolveReviewContext } from "../reviews/language-detection";
import {
  reviewLanguageInputSchema,
  reviewModeSchema,
  reviewResultSchema,
  type ReviewResult,
} from "../reviews/schema";
import {
  createCompletedReview,
  createSnippet,
  createStoredReview,
  indexSnippet,
  isRateLimitError,
  isServiceUnavailableError,
} from "../reviews/service";
import { subscribeToAutoReviews } from "../services/review-events";
import { asyncHandler } from "../utils/async-handler";

const reviewRequestSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  language: reviewLanguageInputSchema.optional().default("auto"),
  filename: z.string().trim().max(255).optional().default(""),
  mode: reviewModeSchema.optional().default("production"),
});

const filenameByLanguage = {
  javascript: "untitled.js",
  typescript: "untitled.ts",
  python: "untitled.py",
  go: "untitled.go",
  rust: "untitled.rs",
  java: "untitled.java",
  cpp: "untitled.cpp",
  other: "untitled.txt",
} as const;

export const reviewsRouter = Router();

reviewsRouter.use(authMiddleware);

reviewsRouter.get(
  "/history",
  asyncHandler(async (request, response) => {
    const limit = clampLimit(request.query.limit);
    const reviews = await prisma.review.findMany({
      where: {
        userId: request.user!.id,
        source: "manual",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        snippetId: true,
        score: true,
        demoScore: true,
        productionScore: true,
        confidenceLevel: true,
        mode: true,
        createdAt: true,
        snippet: {
          select: {
            filename: true,
            language: true,
          },
        },
      },
    });

    response.status(200).json({
      reviews: reviews.map(toManualReviewSummaryResponse),
    });
  }),
);

reviewsRouter.get(
  "/auto",
  asyncHandler(async (request, response) => {
    const limit = clampLimit(request.query.limit);
    const reviews = await prisma.review.findMany({
      where: {
        userId: request.user!.id,
        source: "webhook",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        snippetId: true,
        feedbackMarkdown: true,
        score: true,
        demoScore: true,
        productionScore: true,
        confidenceLevel: true,
        mode: true,
        createdAt: true,
        source: true,
        snippet: {
          select: {
            filename: true,
            language: true,
          },
        },
      },
    });

    response.status(200).json({
      reviews: reviews.map(toAutoReviewResponse),
    });
  }),
);

reviewsRouter.get("/auto/events", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();
  response.write(": connected\n\n");

  const unsubscribe = subscribeToAutoReviews(request.user!.id, (review) => {
    writeEvent(response, "review", review);
  });
  const heartbeat = setInterval(() => {
    response.write(": keep-alive\n\n");
  }, 25_000);

  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  });
});

reviewsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const review = await prisma.review.findFirst({
      where: {
        id: request.params.id as string,
        userId: request.user!.id,
        source: "manual",
      },
      select: {
        id: true,
        snippetId: true,
        feedbackMarkdown: true,
        structuredFeedback: true,
        score: true,
        demoScore: true,
        productionScore: true,
        confidenceLevel: true,
        mode: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        createdAt: true,
        snippet: {
          select: {
            filename: true,
            language: true,
            rawCode: true,
          },
        },
      },
    });

    if (!review) {
      response.status(404).json({
        message: "Review not found",
      });
      return;
    }

    response.status(200).json({
      review: toManualReviewDetailResponse(review),
    });
  }),
);

reviewsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = toReviewInput(reviewRequestSchema.parse(request.body));
    const snippet = await createSnippet(request.user!.id, input);
    const { markdown, review: reviewResult, usage } = await createCompletedReview(input);
    const review = await createStoredReview({
      snippetId: snippet.id,
      userId: request.user!.id,
      markdown,
      review: reviewResult,
      usage,
      mode: input.mode,
    });
    const searchIndexed = await indexSnippet(snippet.id, input.code);

    response.status(201).json({
      reviewId: review.id,
      snippetId: snippet.id,
      filename: input.filename,
      language: input.language,
      review: reviewResult,
      markdown,
      usage,
      searchIndexed,
    });
  }),
);

reviewsRouter.post("/stream", async (request, response, next) => {
  try {
    const input = toReviewInput(reviewRequestSchema.parse(request.body));
    const snippet = await createSnippet(request.user!.id, input);
    const { markdown, review: reviewResult, usage } = await createCompletedReview(input);
    const review = await createStoredReview({
      snippetId: snippet.id,
      userId: request.user!.id,
      markdown,
      review: reviewResult,
      usage,
      mode: input.mode,
    });
    const searchIndexed = await indexSnippet(snippet.id, input.code);

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    writeEvent(response, "message", markdown);
    writeEvent(response, "result", {
      reviewId: review.id,
      snippetId: snippet.id,
      filename: input.filename,
      language: input.language,
      review: reviewResult,
      markdown,
      usage,
    });
    writeEvent(response, "indexing", { searchIndexed });
    response.write("data: [DONE]\n\n");
    response.end();
  } catch (error) {
    if (!response.headersSent) {
      next(error);
      return;
    }

    writeEvent(response, "error", {
      message: toClientMessage(error),
    });
    response.end();
  }
});

function toReviewInput(input: z.infer<typeof reviewRequestSchema>) {
  const fallbackFilename =
    input.language === "auto" ? "untitled.txt" : filenameByLanguage[input.language];
  const filename = input.filename || fallbackFilename;
  const resolved = resolveReviewContext({
    code: input.code,
    filename,
    language: input.language,
  });

  return {
    code: input.code,
    language: resolved.language,
    filename:
      input.filename ||
      (input.language === "auto" ? filenameByLanguage[resolved.language] : fallbackFilename),
    mode: input.mode,
    contexts: resolved.contexts,
  };
}

function clampLimit(limit: unknown) {
  return Math.min(Number.parseInt(String(limit ?? "10"), 10) || 10, 50);
}

function writeEvent(
  response: Response,
  event: "message" | "error" | "indexing" | "review" | "result",
  data:
    | string
    | { message: string }
    | { searchIndexed: boolean }
    | ReturnType<typeof toAutoReviewResponse>
    | {
        reviewId: string;
        snippetId: string;
        filename: string;
        language: string;
        review: ReviewResult;
        markdown: string;
        usage: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      },
) {
  if (event !== "message") {
    response.write(`event: ${event}\n`);
  }

  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function toClientMessage(error: unknown) {
  if (isRateLimitError(error)) {
    return "Too many requests, wait a moment";
  }

  if (isServiceUnavailableError(error)) {
    return "Review service is temporarily unavailable, try again shortly";
  }

  return "Unable to complete the review";
}

function toAutoReviewResponse(review: {
  id: string;
  snippetId: string;
  feedbackMarkdown: string;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  createdAt: Date;
  source: string;
  snippet: {
    filename: string;
    language: string;
  };
}) {
  return {
    id: review.id,
    snippetId: review.snippetId,
    markdown: review.feedbackMarkdown,
    score: review.score,
    demoScore: review.demoScore,
    productionScore: review.productionScore,
    confidenceLevel: review.confidenceLevel,
    mode: review.mode,
    createdAt: review.createdAt,
    source: review.source,
    filename: review.snippet.filename,
    language: review.snippet.language,
  };
}

function toManualReviewSummaryResponse(review: {
  id: string;
  snippetId: string;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  createdAt: Date;
  snippet: {
    filename: string;
    language: string;
  };
}) {
  return {
    id: review.id,
    snippetId: review.snippetId,
    score: review.score,
    demoScore: review.demoScore,
    productionScore: review.productionScore,
    confidenceLevel: review.confidenceLevel,
    mode: review.mode,
    createdAt: review.createdAt,
    filename: review.snippet.filename,
    language: review.snippet.language,
  };
}

function toManualReviewDetailResponse(review: {
  id: string;
  snippetId: string;
  feedbackMarkdown: string;
  structuredFeedback: unknown;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: Date;
  snippet: {
    filename: string;
    language: string;
    rawCode: string;
  };
}) {
  const parsedReview = review.structuredFeedback
    ? reviewResultSchema.safeParse(review.structuredFeedback)
    : null;

  return {
    id: review.id,
    snippetId: review.snippetId,
    markdown: review.feedbackMarkdown,
    review: parsedReview?.success ? parsedReview.data : null,
    score: review.score,
    demoScore: review.demoScore,
    productionScore: review.productionScore,
    confidenceLevel: review.confidenceLevel,
    mode: review.mode,
    usage: {
      ...(review.inputTokens !== null ? { inputTokens: review.inputTokens } : {}),
      ...(review.outputTokens !== null ? { outputTokens: review.outputTokens } : {}),
      ...(review.totalTokens !== null ? { totalTokens: review.totalTokens } : {}),
    },
    createdAt: review.createdAt,
    filename: review.snippet.filename,
    language: review.snippet.language,
    code: review.snippet.rawCode,
  };
}
