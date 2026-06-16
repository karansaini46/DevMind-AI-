import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import {
  createCompletedReview,
  createStoredReview,
  indexSnippet,
} from "../reviews/service";
import { resolveReviewContext } from "../reviews/language-detection";
import { createCommitComment } from "../services/github-repositories";
import { publishAutoReview } from "../services/review-events";
import { decryptGitHubAccessToken } from "../utils/github-token-crypto";
import { logger } from "../utils/logger";
import { getRedisConnectionOptions } from "./redis";
import { reviewQueueName, type ReviewJobData } from "./reviewQueue";

let reviewWorker: Worker<ReviewJobData> | null = null;

export function startReviewWorker() {
  reviewWorker ??= new Worker<ReviewJobData>(
    reviewQueueName,
    async (job) => {
      const existingReview = await prisma.review.findFirst({
        where: {
          snippetId: job.data.snippetId,
          source: "webhook",
        },
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
        },
      });

      if (existingReview) {
        publishAutoReview(job.data.userId, {
          id: existingReview.id,
          snippetId: existingReview.snippetId,
          markdown: existingReview.feedbackMarkdown,
          score: existingReview.score,
          demoScore: existingReview.demoScore,
          productionScore: existingReview.productionScore,
          confidenceLevel: existingReview.confidenceLevel,
          mode: existingReview.mode,
          createdAt: existingReview.createdAt,
          source: existingReview.source,
          filename: job.data.filename,
          language: job.data.language,
        });
        return existingReview;
      }

      const resolved = resolveReviewContext({
        code: job.data.code,
        language: job.data.language,
        filename: job.data.filename,
      });
      const input = {
        code: job.data.code,
        language: resolved.language,
        filename: job.data.filename,
        mode: "production" as const,
        contexts: resolved.contexts,
      };
      const { markdown, review: reviewResult, usage } = await createCompletedReview(input);
      const review = await createStoredReview({
        snippetId: job.data.snippetId,
        userId: job.data.userId,
        markdown,
        review: reviewResult,
        usage,
        mode: input.mode,
        source: "webhook",
      });
      await indexSnippet(job.data.snippetId, job.data.code);

      publishAutoReview(job.data.userId, {
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
        filename: job.data.filename,
        language: job.data.language,
      });

      // Post review as a GitHub commit comment
      if (job.data.commitSha && job.data.repoFullName) {
        const user = await prisma.user.findUnique({
          where: { id: job.data.userId },
          select: { githubAccessToken: true },
        });

        if (user?.githubAccessToken) {
          const score = review.productionScore ?? review.score;
          const commentBody = [
            `## 🤖 DevMind AI Review — \`${job.data.filename}\``,
            "",
            `**Score:** ${score}/10 · **Mode:** Production`,
            "",
            markdown,
          ].join("\n");

          await createCommitComment({
            accessToken: decryptGitHubAccessToken(user.githubAccessToken),
            repoFullName: job.data.repoFullName,
            commitSha: job.data.commitSha,
            body: commentBody,
          });
        }
      }

      logger.info({ msg: "webhook_review_completed", filename: job.data.filename });
      return review;
    },
    {
      connection: getRedisConnectionOptions(),
    },
  );

  reviewWorker.on("failed", (job, error) => {
    logger.error({
      msg: "review_job_failed",
      jobId: job?.id ?? "unknown",
      attempts: job?.attemptsMade ?? 0,
      err: error,
    });
  });

  reviewWorker.on("error", (error) => {
    logger.error({ msg: "review_worker_error", err: error });
  });

  return reviewWorker;
}

export async function closeReviewWorker() {
  if (!reviewWorker) {
    return;
  }

  await reviewWorker.close();
  reviewWorker = null;
}
