import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";

const chunkSize = 500;
const chunkOverlap = 50;
const embeddingDimensions = 768;
const embeddingModel = "gemini-embedding-001";
const embeddingEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent`;

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
  };
}

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
  const response = await fetch(embeddingEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getGeminiApiKey(),
    },
    body: JSON.stringify({
      content: {
        parts: [{ text: content }],
      },
      outputDimensionality: embeddingDimensions,
    }),
  });
  const payload = (await response.json()) as GeminiEmbeddingResponse;

  if (!response.ok) {
    throw buildEmbeddingError(
      response.status,
      payload.error?.message ?? "Gemini embedding request failed",
    );
  }

  const vector = payload.embedding?.values ?? [];

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
      VALUES (${randomUUID()}, ${snippetId}, ${chunk}, ${JSON.stringify(vectors[index])}::vector)
    `;
  }
}

function getGeminiApiKey() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Embedding service is not configured", 503);
  }

  return env.GEMINI_API_KEY;
}

function buildEmbeddingError(status: number, message: string) {
  const error = new Error(message) as Error & {
    status?: number;
  };

  error.status = status;
  return error;
}
