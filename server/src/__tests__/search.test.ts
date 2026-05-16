import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { embedQuery } from "../embeddings/service";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../utils/tokens";

vi.mock("../lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    codeSnippet: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../embeddings/service", () => ({
  embedQuery: vi.fn(),
}));

const queryRaw = prisma.$queryRaw as unknown as Mock;
const codeSnippetFindFirst = prisma.codeSnippet.findFirst as unknown as Mock;
const embedQueryMock = embedQuery as unknown as Mock;

function buildToken() {
  return signAccessToken({
    id: "user-1",
    email: "person@example.com",
    githubId: null,
  });
}

describe("search routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedQueryMock.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  it("rejects protected search requests without a bearer token", async () => {
    const response = await request(app).get("/search?q=authentication");

    expect(response.status).toBe(401);
  });

  it("returns ranked search results scoped to the current user", async () => {
    queryRaw.mockResolvedValue([
      {
        id: "snippet-1",
        filename: "auth.ts",
        language: "typescript",
        rawCode: "export function verifySession() {}",
        createdAt: new Date("2026-05-16T00:00:00.000Z"),
        content: "export function verifySession() {}",
        distance: 0.12,
      },
    ]);

    const response = await request(app)
      .get("/search?q=authentication")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([
      expect.objectContaining({
        id: "snippet-1",
        filename: "auth.ts",
        distance: 0.12,
      }),
    ]);
    expect(queryRaw.mock.calls[0]).toContain("user-1");
  });

  it("rejects empty search queries", async () => {
    const response = await request(app)
      .get("/search?q=%20%20%20")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(400);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});

describe("snippet routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a user-owned snippet", async () => {
    codeSnippetFindFirst.mockResolvedValue({
      id: "snippet-1",
      filename: "auth.ts",
      language: "typescript",
      rawCode: "export function verifySession() {}",
      createdAt: new Date("2026-05-16T00:00:00.000Z"),
    });

    const response = await request(app)
      .get("/snippets/snippet-1")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(codeSnippetFindFirst).toHaveBeenCalledWith({
      where: {
        id: "snippet-1",
        userId: "user-1",
      },
      select: {
        id: true,
        filename: true,
        language: true,
        rawCode: true,
        createdAt: true,
      },
    });
  });

  it("returns not found when the snippet is outside the current user scope", async () => {
    codeSnippetFindFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/snippets/snippet-2")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(404);
  });
});
