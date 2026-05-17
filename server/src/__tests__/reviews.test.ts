import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { embedAndStore } from "../embeddings/service";
import { prisma } from "../lib/prisma";
import {
  createReview,
  scoreReview,
  streamReview,
} from "../reviews/chains";
import { signAccessToken } from "../utils/tokens";

vi.mock("../lib/prisma", () => ({
  prisma: {
    codeSnippet: {
      create: vi.fn(),
    },
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../reviews/chains", () => ({
  createReview: vi.fn(),
  scoreReview: vi.fn(),
  streamReview: vi.fn(),
}));

vi.mock("../embeddings/service", () => ({
  embedAndStore: vi.fn(),
}));

const codeSnippetCreate = prisma.codeSnippet.create as unknown as Mock;
const reviewCreate = prisma.review.create as unknown as Mock;
const reviewFindMany = prisma.review.findMany as unknown as Mock;
const reviewFindFirst = prisma.review.findFirst as unknown as Mock;
const reviewCount = prisma.review.count as unknown as Mock;
const reviewDeleteMany = prisma.review.deleteMany as unknown as Mock;
const createReviewMock = createReview as unknown as Mock;
const scoreReviewMock = scoreReview as unknown as Mock;
const streamReviewMock = streamReview as unknown as Mock;
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
    reviewCount.mockResolvedValue(0);
    reviewDeleteMany.mockResolvedValue({
      count: 0,
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

  it("creates and stores a completed review", async () => {
    createReviewMock.mockResolvedValue("# Review");
    scoreReviewMock.mockResolvedValue(8);

    const response = await request(app)
      .post("/reviews")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "typescript",
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
      data: {
        snippetId: "snippet-1",
        userId: "user-1",
        feedbackMarkdown: "# Review",
        score: 8,
      },
    });
    expect(response.body).toEqual({
      reviewId: "review-1",
      snippetId: "snippet-1",
      markdown: "# Review",
      score: 8,
      searchIndexed: true,
    });
    expect(embedAndStoreMock).toHaveBeenCalledWith("snippet-1", "const value = 1;");
  });

  it("returns a friendly response for non-streaming rate limits", async () => {
    createReviewMock.mockRejectedValue({
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

  it("streams chunks, stores the review, and sends a completion marker", async () => {
    streamReviewMock.mockResolvedValue(
      (async function* () {
        yield "# Review";
        yield "\nUseful feedback";
      })(),
    );
    scoreReviewMock.mockResolvedValue(9);

    const response = await request(app)
      .post("/reviews/stream")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "javascript",
        filename: "sample.js",
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("event: snippet");
    expect(response.text).toContain('data: {"snippetId":"snippet-1"}');
    expect(response.text).toContain('data: "# Review"');
    expect(response.text).toContain('data: "\\nUseful feedback"');
    expect(response.text).toContain('event: indexing');
    expect(response.text).toContain('data: {"searchIndexed":true}');
    expect(response.text).toContain("data: [DONE]");
    expect(reviewCreate).toHaveBeenCalledWith({
      data: {
        snippetId: "snippet-1",
        userId: "user-1",
        feedbackMarkdown: "# Review\nUseful feedback",
        score: 9,
      },
    });
  });

  it("returns a friendly streaming message for provider rate limits", async () => {
    streamReviewMock.mockRejectedValue({
      status: 429,
    });

    const response = await request(app)
      .post("/reviews/stream")
      .set("Authorization", `Bearer ${buildToken()}`)
      .send({
        code: "const value = 1;",
        language: "javascript",
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("event: error");
    expect(response.text).toContain("Too many requests, wait a moment");
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("keeps a completed review when indexing fails", async () => {
    createReviewMock.mockResolvedValue("# Review");
    scoreReviewMock.mockResolvedValue(8);
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

  it("returns recent webhook reviews for the dashboard", async () => {
    reviewFindMany.mockResolvedValueOnce([
      {
        id: "review-1",
        snippetId: "snippet-1",
        feedbackMarkdown: "# Review",
        score: 8,
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
          score: 8,
          createdAt: "2026-05-16T12:00:00.000Z",
          source: "webhook",
          filename: "src/app.ts",
          language: "typescript",
        },
      ],
    });
  });

  it("returns paginated review history with filtered previews", async () => {
    reviewFindMany.mockResolvedValueOnce([
      {
        id: "review-2",
        score: 7,
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
        source: "manual",
        snippet: {
          id: "snippet-2",
          filename: "sample.ts",
          language: "typescript",
          rawCode: "x".repeat(220),
        },
      },
    ]);
    reviewCount.mockResolvedValueOnce(21);

    const response = await request(app)
      .get(
        "/reviews?page=2&limit=20&language=typescript&source=manual&sortBy=score&order=asc&from=2026-05-01&to=2026-05-16",
      )
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          userId: "user-1",
          source: "manual",
          snippet: {
            language: "typescript",
          },
        }),
      }),
    );
    expect(response.body).toEqual({
      reviews: [
        {
          id: "review-2",
          score: 7,
          createdAt: "2026-05-15T12:00:00.000Z",
          source: "manual",
          snippet: {
            id: "snippet-2",
            filename: "sample.ts",
            language: "typescript",
            rawCode: "x".repeat(200),
          },
        },
      ],
      total: 21,
      page: 2,
      totalPages: 2,
    });
  });

  it("returns a full owned review", async () => {
    reviewFindFirst.mockResolvedValueOnce(buildStoredReview());

    const response = await request(app)
      .get(`/reviews/${reviewId()}`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.review.feedbackMarkdown).toBe("# Review");
    expect(response.body.review.snippet.rawCode).toBe("const value = 1;");
  });

  it("creates a fresh review on the existing snippet", async () => {
    reviewFindFirst.mockResolvedValueOnce(buildStoredReview());
    createReviewMock.mockResolvedValueOnce("# Fresh review");
    scoreReviewMock.mockResolvedValueOnce(9);
    reviewCreate.mockResolvedValueOnce({
      id: "review-2",
    });

    const response = await request(app)
      .post(`/reviews/${reviewId()}/re-review`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(201);
    expect(reviewCreate).toHaveBeenCalledWith({
      data: {
        snippetId: "snippet-1",
        userId: "user-1",
        feedbackMarkdown: "# Fresh review",
        score: 9,
      },
    });
    expect(response.body.reviewId).toBe("review-2");
  });

  it("deletes one owned review", async () => {
    reviewDeleteMany.mockResolvedValueOnce({
      count: 1,
    });

    const response = await request(app)
      .delete(`/reviews/${reviewId()}`)
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(204);
    expect(reviewDeleteMany).toHaveBeenCalledWith({
      where: {
        id: reviewId(),
        userId: "user-1",
      },
    });
  });
});

function buildStoredReview() {
  return {
    id: reviewId(),
    score: 8,
    createdAt: new Date("2026-05-16T12:00:00.000Z"),
    source: "manual",
    feedbackMarkdown: "# Review",
    snippet: {
      id: "snippet-1",
      filename: "sample.ts",
      language: "typescript",
      rawCode: "const value = 1;",
      createdAt: new Date("2026-05-16T11:00:00.000Z"),
    },
  };
}

function reviewId() {
  return "3ec14e2a-c36f-48a5-8ff9-a6a6f4f1553e";
}
