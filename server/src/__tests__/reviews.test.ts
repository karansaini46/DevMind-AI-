import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { embedAndStore } from "../embeddings/service";
import { prisma } from "../lib/prisma";
import { createStructuredReview } from "../reviews/chains";
import { signAccessToken } from "../utils/tokens";
import { sampleReviewResult } from "./fixtures/review-samples";

vi.mock("../lib/prisma", () => ({
  prisma: {
    codeSnippet: {
      create: vi.fn(),
    },
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../reviews/chains", () => ({
  createStructuredReview: vi.fn(),
}));

vi.mock("../embeddings/service", () => ({
  embedAndStore: vi.fn(),
}));

const codeSnippetCreate = prisma.codeSnippet.create as unknown as Mock;
const reviewCreate = prisma.review.create as unknown as Mock;
const reviewFindMany = prisma.review.findMany as unknown as Mock;
const reviewFindFirst = prisma.review.findFirst as unknown as Mock;
const createStructuredReviewMock = createStructuredReview as unknown as Mock;
const embedAndStoreMock = embedAndStore as unknown as Mock;

function buildToken() {
  return signAccessToken({
    id: "user-1",
    email: "person@example.com",
    githubId: null,
  });
}

describe("review routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    codeSnippetCreate.mockResolvedValue({
      id: "snippet-1",
    });
    reviewCreate.mockResolvedValue({
      id: "review-1",
    });
    reviewFindMany.mockResolvedValue([]);
    reviewFindFirst.mockResolvedValue(null);
    createStructuredReviewMock.mockResolvedValue({
      review: sampleReviewResult,
      usage: {
        inputTokens: 120,
        outputTokens: 240,
        totalTokens: 360,
      },
    });
    embedAndStoreMock.mockResolvedValue(undefined);
  });

  it("rejects protected requests without a bearer token", async () => {
    const response = await request(app).post("/reviews").send({
      code: "const value = 1;",
      language: "javascript",
    });

    expect(response.status).toBe(401);
  });

  it("rejects empty code before storing anything", async () => {
    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "   ",
        language: "typescript",
      });

    expect(response.status).toBe(400);
    expect(codeSnippetCreate).not.toHaveBeenCalled();
  });

  it("creates and stores a structured completed review", async () => {
    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "typescript",
        mode: "strict",
      });

    expect(response.status).toBe(201);
    expect(codeSnippetCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        filename: "untitled.ts",
        language: "typescript",
        rawCode: "const value = 1;",
      },
    });
    expect(reviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        snippetId: "snippet-1",
        userId: "user-1",
        score: 5,
        structuredFeedback: sampleReviewResult,
        demoScore: 8.5,
        productionScore: 5,
        confidenceLevel: "High",
        mode: "strict",
        inputTokens: 120,
        outputTokens: 240,
        totalTokens: 360,
      }),
    });
    expect(response.body).toEqual({
      reviewId: "review-1",
      snippetId: "snippet-1",
      filename: "untitled.ts",
      language: "typescript",
      review: sampleReviewResult,
      markdown: expect.stringContaining("## Quick Verdict"),
      usage: {
        inputTokens: 120,
        outputTokens: 240,
        totalTokens: 360,
      },
      searchIndexed: true,
    });
    expect(embedAndStoreMock).toHaveBeenCalledWith("snippet-1", "const value = 1;");
  });

  it("detects language when auto is requested", async () => {
    await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "export function sum(values: number[]) { return values.length; }",
        language: "auto",
        filename: "sum.ts",
      });

    expect(codeSnippetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        filename: "sum.ts",
        language: "typescript",
      }),
    });
    expect(createStructuredReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "typescript",
      }),
    );
  });

  it("returns a friendly response for provider rate limits", async () => {
    createStructuredReviewMock.mockRejectedValue({
      status: 429,
    });

    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "javascript",
      });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      message: "Too many requests, wait a moment",
    });
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("returns a friendly response when the provider is temporarily unavailable", async () => {
    createStructuredReviewMock.mockRejectedValue({
      statusCode: 503,
    });

    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "javascript",
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message: "Review service is temporarily unavailable, try again shortly",
    });
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("keeps a completed review when indexing fails", async () => {
    embedAndStoreMock.mockRejectedValueOnce(new Error("provider unavailable"));

    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "typescript",
      });

    expect(response.status).toBe(201);
    expect(response.body.searchIndexed).toBe(false);
  });

  it("returns recent manual review history", async () => {
    reviewFindMany.mockResolvedValueOnce([
      {
        id: "review-1",
        snippetId: "snippet-1",
        score: 5,
        demoScore: 8.5,
        productionScore: 5,
        confidenceLevel: "High",
        mode: "production",
        createdAt: new Date("2026-05-16T12:00:00.000Z"),
        snippet: {
          filename: "src/app.ts",
          language: "typescript",
        },
      },
    ]);

    const response = await request(app)
      .get("/reviews/history")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      reviews: [
        {
          id: "review-1",
          snippetId: "snippet-1",
          score: 5,
          demoScore: 8.5,
          productionScore: 5,
          confidenceLevel: "High",
          mode: "production",
          createdAt: "2026-05-16T12:00:00.000Z",
          filename: "src/app.ts",
          language: "typescript",
        },
      ],
    });
  });

  it("returns one stored manual review", async () => {
    reviewFindFirst.mockResolvedValueOnce({
      id: "review-1",
      snippetId: "snippet-1",
      feedbackMarkdown: "## Quick Verdict",
      structuredFeedback: sampleReviewResult,
      score: 5,
      demoScore: 8.5,
      productionScore: 5,
      confidenceLevel: "High",
      mode: "production",
      inputTokens: 120,
      outputTokens: 240,
      totalTokens: 360,
      createdAt: new Date("2026-05-16T12:00:00.000Z"),
      snippet: {
        filename: "src/app.ts",
        language: "typescript",
        rawCode: "const value = 1;",
      },
    });

    const response = await request(app)
      .get("/reviews/review-1")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.review.review).toEqual(sampleReviewResult);
    expect(response.body.review.usage).toEqual({
      inputTokens: 120,
      outputTokens: 240,
      totalTokens: 360,
    });
  });

  it("returns recent webhook reviews for the dashboard", async () => {
    reviewFindMany.mockResolvedValueOnce([
      {
        id: "review-1",
        snippetId: "snippet-1",
        feedbackMarkdown: "# Review",
        score: 5,
        demoScore: 8.5,
        productionScore: 5,
        confidenceLevel: "High",
        mode: "production",
        createdAt: new Date("2026-05-16T12:00:00.000Z"),
        source: "webhook",
        snippet: {
          filename: "src/app.ts",
          language: "typescript",
        },
      },
    ]);

    const response = await request(app)
      .get("/reviews/auto")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      reviews: [
        {
          id: "review-1",
          snippetId: "snippet-1",
          markdown: "# Review",
          score: 5,
          demoScore: 8.5,
          productionScore: 5,
          confidenceLevel: "High",
          mode: "production",
          createdAt: "2026-05-16T12:00:00.000Z",
          source: "webhook",
          filename: "src/app.ts",
          language: "typescript",
        },
      ],
    });
  });
});
