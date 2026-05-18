import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "../lib/prisma";
import { chunkCode, embedAndStore } from "../embeddings/service";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        embedding: {
          values: Array.from({ length: 768 }, () => 0.1),
        },
      }),
    });
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });

  it("requests the current Gemini model with 768-dimensional output", async () => {
    await embedAndStore("snippet-1", "hello world");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "test-key",
        },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text: "hello world" }],
          },
          outputDimensionality: 768,
        }),
      }),
    );
  });
});
