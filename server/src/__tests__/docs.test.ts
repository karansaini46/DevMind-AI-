import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { prisma } from "../lib/prisma";
import { createDocumentation } from "../documentation/workflow";
import { signAccessToken } from "../utils/tokens";

vi.mock("../lib/prisma", () => ({
  prisma: {
    codeSnippet: {
      findFirst: vi.fn(),
    },
    documentation: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../documentation/workflow", () => ({
  createDocumentation: vi.fn(),
}));

const codeSnippetFindFirst = prisma.codeSnippet.findFirst as unknown as Mock;
const documentationUpsert = prisma.documentation.upsert as unknown as Mock;
const createDocumentationMock = createDocumentation as unknown as Mock;

describe("documentation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects protected requests without a bearer token", async () => {
    const response = await request(app).post("/docs/generate").send({
      snippetId: snippetId(),
    });

    expect(response.status).toBe(401);
  });

  it("creates documentation for an owned snippet", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce({
      id: snippetId(),
      filename: "sample.ts",
      rawCode: "export function sum(a: number, b: number) { return a + b; }",
      documentation: null,
    });
    createDocumentationMock.mockResolvedValueOnce({
      commentedCode: "/** Adds two numbers. */\nexport function sum(a: number, b: number) { return a + b; }",
      readmeSection: "## sample.ts",
      language: "TypeScript",
    });
    documentationUpsert.mockResolvedValueOnce(buildDocumentation());

    const response = await request(app)
      .post("/docs/generate")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        snippetId: snippetId(),
      });

    expect(response.status).toBe(201);
    expect(createDocumentationMock).toHaveBeenCalledWith({
      code: "export function sum(a: number, b: number) { return a + b; }",
      filename: "sample.ts",
    });
    expect(documentationUpsert).toHaveBeenCalledWith({
      where: {
        snippetId: snippetId(),
      },
      update: {},
      create: {
        snippetId: snippetId(),
        commentedCode:
          "/** Adds two numbers. */\nexport function sum(a: number, b: number) { return a + b; }",
        readmeSection: "## sample.ts",
        language: "TypeScript",
      },
    });
    expect(response.body).toEqual({
      id: "documentation-1",
      snippetId: snippetId(),
      commentedCode:
        "/** Adds two numbers. */\nexport function sum(a: number, b: number) { return a + b; }",
      readmeSection: "## sample.ts",
      language: "TypeScript",
      createdAt: "2026-05-16T12:00:00.000Z",
    });
  });

  it("returns the stored result without running the workflow again", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce({
      id: snippetId(),
      filename: "sample.ts",
      rawCode: "const value = 1;",
      documentation: buildDocumentation(),
    });

    const response = await request(app)
      .post("/docs/generate")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        snippetId: snippetId(),
      });

    expect(response.status).toBe(201);
    expect(createDocumentationMock).not.toHaveBeenCalled();
    expect(documentationUpsert).not.toHaveBeenCalled();
  });

  it("returns stored documentation for an owned snippet", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce({
      documentation: buildDocumentation(),
    });

    const response = await request(app)
      .get(`/docs/${snippetId()}`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.language).toBe("TypeScript");
  });

  it("returns not found for snippets outside the current user scope", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce(null);

    const response = await request(app)
      .get(`/docs/${snippetId()}`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(404);
  });

  it("returns not found when no documentation has been stored", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce({
      documentation: null,
    });

    const response = await request(app)
      .get(`/docs/${snippetId()}`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(404);
  });

  it("returns a friendly response for provider rate limits", async () => {
    codeSnippetFindFirst.mockResolvedValueOnce({
      id: snippetId(),
      filename: "sample.ts",
      rawCode: "const value = 1;",
      documentation: null,
    });
    createDocumentationMock.mockRejectedValueOnce({
      status: 429,
    });

    const response = await request(app)
      .post("/docs/generate")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        snippetId: snippetId(),
      });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      message: "Too many requests, wait a moment",
    });
  });
});

function buildToken() {
  return signAccessToken({
    id: "user-1",
    email: "person@example.com",
    githubId: null,
  });
}

function snippetId() {
  return "3ec14e2a-c36f-48a5-8ff9-a6a6f4f1553f";
}

function buildDocumentation() {
  return {
    id: "documentation-1",
    snippetId: snippetId(),
    commentedCode:
      "/** Adds two numbers. */\nexport function sum(a: number, b: number) { return a + b; }",
    readmeSection: "## sample.ts",
    language: "TypeScript",
    createdAt: new Date("2026-05-16T12:00:00.000Z"),
  };
}
