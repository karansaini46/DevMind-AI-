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
});
