import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import {
  createOrGetDocumentation,
  getDocumentation,
} from "../documentation/service";
import { isRateLimitError } from "../reviews/service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

const generateDocumentationSchema = z.object({
  snippetId: z.string().uuid(),
});
const snippetIdSchema = z.string().uuid();

export const docsRouter = Router();

docsRouter.use(authMiddleware);

docsRouter.post(
  "/generate",
  asyncHandler(async (request, response) => {
    const input = generateDocumentationSchema.parse(request.body);

    try {
      const documentation = await createOrGetDocumentation(
        request.user!.id,
        input.snippetId,
      );

      response.status(201).json(toDocumentationResponse(documentation));
    } catch (error) {
      if (isRateLimitError(error)) {
        throw new AppError("Too many requests, wait a moment", 429);
      }

      throw error;
    }
  }),
);

docsRouter.get(
  "/:snippetId",
  asyncHandler(async (request, response) => {
    const snippetId = snippetIdSchema.parse(request.params.snippetId);
    const documentation = await getDocumentation(
      request.user!.id,
      snippetId,
    );

    response.status(200).json(toDocumentationResponse(documentation));
  }),
);

function toDocumentationResponse(documentation: {
  id: string;
  snippetId: string;
  commentedCode: string;
  readmeSection: string;
  language: string;
  createdAt: Date;
}) {
  return {
    id: documentation.id,
    snippetId: documentation.snippetId,
    commentedCode: documentation.commentedCode,
    readmeSection: documentation.readmeSection,
    language: documentation.language,
    createdAt: documentation.createdAt,
  };
}
