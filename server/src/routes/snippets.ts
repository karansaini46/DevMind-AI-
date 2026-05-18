import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export const snippetsRouter = Router();

snippetsRouter.use(authMiddleware);

snippetsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const snippetId = request.params.id as string;
    const snippet = await prisma.codeSnippet.findFirst({
      where: {
        id: snippetId,
        userId: request.user!.id,
      },
      select: {
        id: true,
        filename: true,
        language: true,
        rawCode: true,
        createdAt: true,
      },
    });

    if (!snippet) {
      throw new AppError("Snippet not found", 404);
    }

    response.status(200).json({ snippet });
  }),
);
