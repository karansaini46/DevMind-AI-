import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

export const reviewQueueName = "code-review";

export interface ReviewJobData {
  snippetId: string;
  code: string;
  language: string;
  filename: string;
  userId: string;
}

let reviewQueue: Queue<ReviewJobData> | null = null;

export function getReviewQueue() {
  reviewQueue ??= new Queue<ReviewJobData>(reviewQueueName, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1_000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 1_000,
      },
    },
  });

  return reviewQueue;
}

export async function enqueueReviewJob(
  data: ReviewJobData,
  options: { jobId: string },
) {
  return getReviewQueue().add("review-file", data, options);
}

export async function hasReviewJob(jobId: string) {
  return Boolean(await getReviewQueue().getJob(jobId));
}

export async function closeReviewQueue() {
  if (!reviewQueue) {
    return;
  }

  await reviewQueue.close();
  reviewQueue = null;
}
