import { Router } from "express";
import { z } from "zod";
import { embedQuery } from "../embeddings/service";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Query is required"),
});

interface SearchResultRow {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
  createdAt: Date;
  content: string;
  distance: number;
}

export const searchRouter = Router();

searchRouter.use(authMiddleware);

searchRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { q } = searchQuerySchema.parse(request.query);
    const vector = await embedQuery(q);
    const vectorValue = JSON.stringify(vector);
    const results = await prisma.$queryRaw<SearchResultRow[]>`
      WITH ranked AS (
        SELECT
          s.id,
          s.filename,
          s.language,
          s."rawCode",
          s."createdAt",
          e.content,
          e.embedding <=> ${vectorValue}::vector AS distance,
          ROW_NUMBER() OVER (
            PARTITION BY s.id
            ORDER BY e.embedding <=> ${vectorValue}::vector ASC
          ) AS rank
        FROM "Embedding" e
        JOIN "CodeSnippet" s ON s.id = e."snippetId"
        WHERE s."userId" = ${request.user!.id}::uuid
      )
      SELECT id, filename, language, "rawCode", "createdAt", content, distance
      FROM ranked
      WHERE rank = 1
      ORDER BY distance ASC
      LIMIT 10
    `;

    response.status(200).json({ results });
  }),
);
