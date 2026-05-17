import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  scoreReview,
  streamReview,
  type ReviewInput,
} from "../reviews/chains";
import {
  createCompletedReview,
  createSnippet,
  createStoredReview,
  indexSnippet,
  isRateLimitError,
} from "../reviews/service";
import { subscribeToAutoReviews } from "../services/review-events";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

const reviewLanguages = [
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
  "cpp",
  "other",
] as const;

const reviewSources = ["manual", "webhook"] as const;

const reviewRequestSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  language: z.enum(reviewLanguages),
  filename: z.string().trim().max(255).optional().default(""),
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const reviewIdSchema = z.string().uuid();

const reviewHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  language: z.enum(reviewLanguages).optional(),
  source: z.enum(reviewSources).optional(),
  sortBy: z.enum(["createdAt", "score"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
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
  "/",
  asyncHandler(async (request, response) => {
    const query = reviewHistoryQuerySchema.parse(request.query);
    const createdAt = toDateRange(query.from, query.to);
    const where = {
      userId: request.user!.id,
      ...(query.language
        ? {
            snippet: {
              language: query.language,
            },
          }
        : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: toHistoryOrderBy(query.sortBy, query.order),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          score: true,
          createdAt: true,
          source: true,
          snippet: {
            select: {
              id: true,
              filename: true,
              language: true,
              rawCode: true,
            },
          },
        },
      }),
      prisma.review.count({
        where,
      }),
    ]);

    response.status(200).json({
      reviews: reviews.map(toReviewSummary),
      total,
      page: query.page,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

reviewsRouter.get(
  "/auto",
  asyncHandler(async (request, response) => {
    const limit = Math.min(
      Number.parseInt(String(request.query.limit ?? "10"), 10) || 10,
      50,
    );
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

reviewsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const review = await findOwnedReview(
      reviewIdSchema.parse(request.params.id),
      request.user!.id,
    );

    response.status(200).json({
      review,
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

reviewsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = toReviewInput(reviewRequestSchema.parse(request.body));
    const snippet = await createSnippet(request.user!.id, input);
    const { markdown, score } = await createCompletedReview(input);
    const review = await createStoredReview({
      snippetId: snippet.id,
      userId: request.user!.id,
      markdown,
      score,
    });
    const searchIndexed = await indexSnippet(snippet.id, input.code);

    response.status(201).json({
      reviewId: review.id,
      snippetId: snippet.id,
      markdown,
      score,
      searchIndexed,
    });
  }),
);

reviewsRouter.post(
  "/:id/re-review",
  asyncHandler(async (request, response) => {
    const review = await findOwnedReview(
      reviewIdSchema.parse(request.params.id),
      request.user!.id,
    );
    const input = {
      code: review.snippet.rawCode,
      language: review.snippet.language as ReviewInput["language"],
      filename: review.snippet.filename,
    };
    const { markdown, score } = await createCompletedReview(input);
    const nextReview = await createStoredReview({
      snippetId: review.snippet.id,
      userId: request.user!.id,
      markdown,
      score,
    });

    response.status(201).json({
      reviewId: nextReview.id,
      snippetId: review.snippet.id,
      markdown,
      score,
    });
  }),
);

reviewsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const reviewId = reviewIdSchema.parse(request.params.id);
    const result = await prisma.review.deleteMany({
      where: {
        id: reviewId,
        userId: request.user!.id,
      },
    });

    if (result.count === 0) {
      throw new AppError("Review not found", 404);
    }

    response.status(204).send();
  }),
);

reviewsRouter.post("/stream", async (request, response, next) => {
  try {
    const input = toReviewInput(reviewRequestSchema.parse(request.body));
    const snippet = await createSnippet(request.user!.id, input);

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    writeEvent(response, "snippet", { snippetId: snippet.id });

    let markdown = "";
    const stream = await streamReview(input);

    for await (const chunk of stream) {
      markdown += chunk;
      writeEvent(response, "message", chunk);
    }

    const score = await scoreReview(input);
    await createStoredReview({
      snippetId: snippet.id,
      userId: request.user!.id,
      markdown,
      score,
    });
    const searchIndexed = await indexSnippet(snippet.id, input.code);

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

function toReviewInput(input: z.infer<typeof reviewRequestSchema>): ReviewInput {
  return {
    code: input.code,
    language: input.language,
    filename: input.filename || filenameByLanguage[input.language],
  };
}

function toReviewSummary(review: {
  id: string;
  score: number;
  createdAt: Date;
  source: string;
  snippet: {
    id: string;
    filename: string;
    language: string;
    rawCode: string;
  };
}) {
  return {
    id: review.id,
    score: review.score,
    createdAt: review.createdAt,
    source: review.source,
    snippet: {
      ...review.snippet,
      rawCode: review.snippet.rawCode.slice(0, 200),
    },
  };
}

function toHistoryOrderBy(
  sortBy: "createdAt" | "score",
  order: "asc" | "desc",
) {
  return sortBy === "score"
    ? [{ score: order }, { createdAt: "desc" as const }, { id: "desc" as const }]
    : [{ createdAt: order }, { id: order }];
}

function toDateRange(from: string | undefined, to: string | undefined) {
  if (!from && !to) {
    return undefined;
  }

  const start = from ? parseDateOnly(from) : undefined;
  const end = to ? addUtcDays(parseDateOnly(to), 1) : undefined;

  if (start && end && start >= end) {
    throw new AppError("Invalid date range", 400);
  }

  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: end } : {}),
  };
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function findOwnedReview(id: string, userId: string) {
  const review = await prisma.review.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      score: true,
      createdAt: true,
      source: true,
      feedbackMarkdown: true,
      snippet: {
        select: {
          id: true,
          filename: true,
          language: true,
          rawCode: true,
          createdAt: true,
        },
      },
    },
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return review;
}

function writeEvent(
  response: Response,
  event: "message" | "error" | "indexing" | "review" | "snippet",
  data:
    | string
    | { message: string }
    | { searchIndexed: boolean }
    | { snippetId: string }
    | ReturnType<typeof toAutoReviewResponse>,
) {
  if (event !== "message") {
    response.write(`event: ${event}\n`);
  }

  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function toClientMessage(error: unknown) {
  return isRateLimitError(error)
    ? "Too many requests, wait a moment"
    : "Unable to complete the review";
}

function toAutoReviewResponse(review: {
  id: string;
  snippetId: string;
  feedbackMarkdown: string;
  score: number;
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
    createdAt: review.createdAt,
    source: review.source,
    filename: review.snippet.filename,
    language: review.snippet.language,
  };
}
