import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  createReview,
  scoreReview,
  streamReview,
  type ReviewInput,
} from "../reviews/chains";
import { AppError } from "../utils/app-error";
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

    response.status(201).json({
      reviewId: review.id,
      snippetId: snippet.id,
      markdown,
      score,
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

async function createSnippet(userId: string, input: ReviewInput) {
  return prisma.codeSnippet.create({
    data: {
      userId,
      filename: input.filename,
      language: input.language,
      rawCode: input.code,
    },
  });
}

async function createStoredReview(input: {
  snippetId: string;
  userId: string;
  markdown: string;
  score: number;
}) {
  return prisma.review.create({
    data: {
      snippetId: input.snippetId,
      userId: input.userId,
      feedbackMarkdown: input.markdown,
      score: input.score,
    },
  });
}

async function createCompletedReview(input: ReviewInput) {
  try {
    const markdown = await createReview(input);
    const score = await scoreReview(input);

    return { markdown, score };
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new AppError("Too many requests, wait a moment", 429);
    }

    throw error;
  }
}

function writeEvent(response: Response, event: "message" | "error", data: string | { message: string }) {
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

function isRateLimitError(error: unknown) {
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
