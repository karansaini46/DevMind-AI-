import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  createRepositoryWebhook,
  deleteRepositoryWebhook,
} from "../services/github-repositories";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { env } from "../utils/env";
import { decryptGitHubAccessToken } from "../utils/github-token-crypto";

const repositorySchema = z.object({
  repoFullName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repository must use owner/name format"),
});

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

settingsRouter.get(
  "/repository",
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user!.id,
      },
      select: {
        connectedRepo: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    response.status(200).json({
      connectedRepo: user.connectedRepo,
    });
  }),
);

settingsRouter.post(
  "/connect-repo",
  asyncHandler(async (request, response) => {
    const input = repositorySchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        id: request.user!.id,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.githubAccessToken) {
      throw new AppError("Connect GitHub before adding a repository", 409);
    }

    if (
      user.connectedRepo &&
      user.connectedRepo.toLowerCase() !== input.repoFullName.toLowerCase()
    ) {
      throw new AppError("Disconnect the current repository first", 409);
    }

    if (user.connectedRepo && user.webhookId) {
      response.status(200).json({
        connectedRepo: user.connectedRepo,
      });
      return;
    }

    const accessToken = decryptGitHubAccessToken(user.githubAccessToken);
    const webhook = await createRepositoryWebhook({
      accessToken,
      repoFullName: input.repoFullName,
      webhookUrl: env.WEBHOOK_URL,
      secret: env.GITHUB_WEBHOOK_SECRET,
    });
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        connectedRepo: input.repoFullName,
        webhookId: String(webhook.id),
      },
      select: {
        connectedRepo: true,
      },
    });

    response.status(201).json({
      connectedRepo: updatedUser.connectedRepo,
    });
  }),
);

settingsRouter.delete(
  "/disconnect-repo",
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user!.id,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.connectedRepo || !user.webhookId) {
      response.status(204).send();
      return;
    }

    if (!user.githubAccessToken) {
      throw new AppError("Reconnect GitHub before removing the repository", 409);
    }

    const accessToken = decryptGitHubAccessToken(user.githubAccessToken);
    await deleteRepositoryWebhook({
      accessToken,
      repoFullName: user.connectedRepo,
      webhookId: user.webhookId,
    });
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        connectedRepo: null,
        webhookId: null,
      },
    });

    response.status(204).send();
  }),
);
