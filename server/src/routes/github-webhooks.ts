import {
  createHmac,
  timingSafeEqual,
} from "crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { enqueueReviewJob, hasReviewJob } from "../jobs/reviewQueue";
import { getRepositoryFileContent } from "../services/github-repositories";
import { asyncHandler } from "../utils/async-handler";
import { env } from "../utils/env";
import { decryptGitHubAccessToken } from "../utils/github-token-crypto";

const supportedLanguages = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
} as const;

const maxFileBytes = 100 * 1024;

interface PushPayload {
  after: string;
  repository: {
    full_name: string;
  };
  commits: Array<{
    added?: string[];
    modified?: string[];
  }>;
}

export const githubWebhooksRouter = Router();

githubWebhooksRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(request.body ?? "");

    if (!isValidSignature(rawBody, request.header("x-hub-signature-256"))) {
      response.status(401).json({
        message: "Invalid webhook signature",
      });
      return;
    }

    if (request.header("x-github-event") !== "push") {
      response.status(200).json({
        queued: 0,
      });
      return;
    }

    const deliveryId = request.header("x-github-delivery");

    if (!deliveryId) {
      response.status(400).json({
        message: "Missing delivery identifier",
      });
      return;
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as PushPayload;
    const user = await prisma.user.findFirst({
      where: {
        connectedRepo: {
          equals: payload.repository.full_name,
          mode: "insensitive",
        },
      },
    });

    if (!user?.githubAccessToken) {
      response.status(200).json({
        queued: 0,
      });
      return;
    }

    const accessToken = decryptGitHubAccessToken(user.githubAccessToken);
    const paths = getChangedCodePaths(payload);
    const queued = await queueChangedFiles({
      accessToken,
      deliveryId,
      payload,
      paths,
      userId: user.id,
    });

    response.status(202).json({
      queued,
    });
  }),
);

function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac(
    "sha256",
    env.GITHUB_WEBHOOK_SECRET,
  )
    .update(rawBody)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signatureHeader);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function getChangedCodePaths(payload: PushPayload) {
  const paths = new Set<string>();

  for (const commit of payload.commits) {
    for (const path of [...(commit.added ?? []), ...(commit.modified ?? [])]) {
      if (getLanguage(path)) {
        paths.add(path);
      }
    }
  }

  return [...paths];
}

async function queueChangedFiles(input: {
  accessToken: string;
  deliveryId: string;
  payload: PushPayload;
  paths: string[];
  userId: string;
}) {
  const results = await Promise.allSettled(
    input.paths.map(async (path) => {
      const language = getLanguage(path);

      if (!language) {
        return false;
      }

      const jobId = `${input.deliveryId}-${hashPath(path)}`;

      if (await hasReviewJob(jobId)) {
        return false;
      }

      const code = await getRepositoryFileContent({
        accessToken: input.accessToken,
        repoFullName: input.payload.repository.full_name,
        ref: input.payload.after,
        path,
        maxBytes: maxFileBytes,
      });

      if (!code) {
        return false;
      }

      const snippet = await prisma.codeSnippet.create({
        data: {
          userId: input.userId,
          filename: path,
          language,
          rawCode: code,
        },
      });

      await enqueueReviewJob(
        {
          snippetId: snippet.id,
          code,
          language,
          filename: path,
          userId: input.userId,
        },
        {
          jobId,
        },
      );

      return true;
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Unable to queue webhook file", result.reason);
    }
  }

  return results.filter((result) => result.status === "fulfilled" && result.value).length;
}

function getLanguage(path: string) {
  const lowerCasePath = path.toLowerCase();
  const extension = Object.keys(supportedLanguages).find((candidate) =>
    lowerCasePath.endsWith(candidate),
  ) as keyof typeof supportedLanguages | undefined;

  return extension ? supportedLanguages[extension] : null;
}

function hashPath(path: string) {
  return createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
    .update(path)
    .digest("hex")
    .slice(0, 24);
}
