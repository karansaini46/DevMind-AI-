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
import { asyncHandler } from "../utils/async-handler";

const reviewRequestSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  language: z.enum([
    "javascript",
    "typescript",
    "python",
    "go",
    "rust",
    "java",
    "cpp",
    "other",
  ]),
  filename: z.string().trim().max(255).optional().default(""),
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

reviewsRouter.post("/stream", async (request, response, next) => {
  try {
    const input = toReviewInput(reviewRequestSchema.parse(request.body));
    const snippet = await createSnippet(request.user!.id, input);

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

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

function writeEvent(
  response: Response,
  event: "message" | "error" | "indexing" | "review",
  data:
    | string
    | { message: string }
    | { searchIndexed: boolean }
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
