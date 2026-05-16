import { randomUUID } from "node:crypto";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";

const chunkSize = 500;
const chunkOverlap = 50;
const embeddingDimensions = 768;

let embeddingClient: GoogleGenerativeAIEmbeddings | null = null;

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
  const vector = await getEmbeddingClient().embedQuery(content);

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

function getEmbeddingClient() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Embedding service is not configured", 503);
  }

  embeddingClient ??= new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: env.GEMINI_API_KEY,
  });

  return embeddingClient;
}
