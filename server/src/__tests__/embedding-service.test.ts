import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { prisma } from "../lib/prisma";
import { chunkCode, embedAndStore, embedQuery } from "../embeddings/service";

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
const embeddingValues = Array.from({ length: 768 }, () => 0.1);
const fetchMock = vi.fn();

describe("embedding service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        embedding: {
          values: embeddingValues,
        },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits long code into overlapping chunks", () => {
    const code = "a".repeat(950);
    const chunks = chunkCode(code);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[0].slice(-50)).toBe(chunks[1].slice(0, 50));
  });

  it("requests 768-dimensional embeddings from the current Gemini model", async () => {
    await expect(embedQuery("const value = 1;")).resolves.toEqual(embeddingValues);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "test-key",
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: "const value = 1;" }],
          },
          outputDimensionality: 768,
        }),
      }),
    );
  });

  it("stores one vector per chunk", async () => {
    await embedAndStore("snippet-1", "a".repeat(950));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
