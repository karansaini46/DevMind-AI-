import request from "supertest";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { app } from "../app";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../utils/tokens";

vi.mock("../lib/prisma", () => ({
  prisma: {
    review: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

const reviewAggregate = prisma.review.aggregate as unknown as Mock;
const reviewCount = prisma.review.count as unknown as Mock;
const reviewFindMany = prisma.review.findMany as unknown as Mock;
const queryRaw = prisma.$queryRaw as unknown as Mock;

describe("dashboard routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewAggregate.mockResolvedValue({
      _count: {
        _all: 3,
      },
      _avg: {
        score: 22 / 3,
      },
    });
    reviewCount.mockResolvedValue(2);
    queryRaw
      .mockResolvedValueOnce([
        {
          language: "typescript",
          count: 2,
        },
        {
          language: "python",
          count: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          count: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          date: "2026-05-15",
          avgScore: 6.5,
        },
        {
          date: "2026-05-16",
          avgScore: 9,
        },
      ]);
    reviewFindMany.mockResolvedValue([
      {
        id: "review-3",
        score: 9,
        createdAt: new Date("2026-05-16T12:00:00.000Z"),
        source: "webhook",
        snippet: {
          id: "snippet-3",
          filename: "src/app.ts",
          language: "typescript",
          rawCode: "x".repeat(220),
        },
      },
    ]);
  });

  it("returns dashboard aggregates and recent reviews", async () => {
    const response = await request(app)
      .get("/dashboard/stats")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalReviews: 3,
      averageScore: 7.3,
      languagesUsed: 2,
      languageBreakdown: [
        {
          language: "typescript",
          count: 2,
        },
        {
          language: "python",
          count: 1,
        },
      ],
      reviewsThisWeek: 2,
      scoreOverTime: [
        {
          date: "2026-05-15",
          avgScore: 6.5,
        },
        {
          date: "2026-05-16",
          avgScore: 9,
        },
      ],
      recentReviews: [
        {
          id: "review-3",
          score: 9,
          createdAt: "2026-05-16T12:00:00.000Z",
          source: "webhook",
          snippet: {
            id: "snippet-3",
            filename: "src/app.ts",
            language: "typescript",
            rawCode: "x".repeat(200),
          },
        },
      ],
    });
  });

  it("returns empty aggregate defaults for new users", async () => {
    reviewAggregate.mockResolvedValueOnce({
      _count: {
        _all: 0,
      },
      _avg: {
        score: null,
      },
    });
    reviewCount.mockResolvedValueOnce(0);
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          count: 0,
        },
      ])
      .mockResolvedValueOnce([]);
    reviewFindMany.mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/dashboard/stats")
      .set("Authorization", `Bearer ${buildToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.totalReviews).toBe(0);
    expect(response.body.averageScore).toBe(0);
    expect(response.body.languagesUsed).toBe(0);
    expect(response.body.recentReviews).toEqual([]);
  });
});

function buildToken() {
  return signAccessToken({
    id: "user-1",
    email: "person@example.com",
    githubId: null,
  });
}
