import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "../lib/prisma";
import { chunkCode, embedAndStore } from "../embeddings/service";

const embedQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@langchain/google-genai", () => ({
  GoogleGenerativeAIEmbeddings: class {
    embedQuery = embedQueryMock;
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    $executeRaw: vi.fn(),
  },
}));

vi.mock("../utils/env", () => ({
  env: {
    GEMINI_API_KEY: "test-key",
  },
}));

const executeRaw = prisma.$executeRaw as unknown as Mock;

describe("embedding service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedQueryMock.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  it("splits long code into overlapping chunks", () => {
    const code = "a".repeat(950);
    const chunks = chunkCode(code);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[0].slice(-50)).toBe(chunks[1].slice(0, 50));
  });

  it("stores one vector per chunk", async () => {
    await embedAndStore("snippet-1", "a".repeat(950));

    expect(embedQueryMock).toHaveBeenCalledTimes(2);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
