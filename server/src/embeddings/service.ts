import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";

const chunkSize = 500;
const chunkOverlap = 50;
const embeddingDimensions = 768;
const embeddingModel = "gemini-embedding-001";
const embeddingEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent`;

export function chunkCode(code: string) {
  if (!code) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < code.length) {
    const end = Math.min(start + chunkSize, code.length);
    chunks.push(code.slice(start, end));

    if (end === code.length) {
      break;
    }

    start = end - chunkOverlap;
  }

  return chunks;
}

export async function embedQuery(content: string) {
  const vector = await requestEmbedding(content);

  if (vector.length !== embeddingDimensions) {
    throw new Error(`Expected ${embeddingDimensions} embedding values`);
  }

  return vector;
}

export async function embedAndStore(snippetId: string, code: string) {
  const chunks = chunkCode(code);
  const vectors: number[][] = [];

  for (const chunk of chunks) {
    vectors.push(await embedQuery(chunk));
  }

  for (const [index, chunk] of chunks.entries()) {
    await prisma.$executeRaw`
      INSERT INTO "Embedding" (id, "snippetId", content, embedding)
      VALUES (${randomUUID()}::uuid, ${snippetId}::uuid, ${chunk}, ${JSON.stringify(vectors[index])}::vector)
    `;
  }
}

async function requestEmbedding(content: string) {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Embedding service is not configured", 503);
  }

  const response = await fetch(embeddingEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: `models/${embeddingModel}`,
      content: {
        parts: [{ text: content }],
      },
      outputDimensionality: embeddingDimensions,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | {
        embedding?: {
          values?: number[];
        };
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Unable to generate embedding");
  }

  return body?.embedding?.values ?? [];
}
