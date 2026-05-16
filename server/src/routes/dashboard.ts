import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

interface LanguageBreakdownRow {
  language: string;
  count: number;
}

interface LanguageCountRow {
  count: number;
}

interface ScoreOverTimeRow {
  date: string;
  avgScore: number;
}

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get(
  "/stats",
  asyncHandler(async (request, response) => {
    const userId = request.user!.id;
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
    const chartStart = startOfUtcDay(addUtcDays(now, -29));

    const [
      reviewAggregate,
      reviewsThisWeek,
      languageBreakdown,
      languageCountRows,
      scoreOverTime,
      recentReviews,
    ] = await Promise.all([
      prisma.review.aggregate({
        where: {
          userId,
        },
        _count: {
          _all: true,
        },
        _avg: {
          score: true,
        },
      }),
      prisma.review.count({
        where: {
          userId,
          createdAt: {
            gte: weekStart,
          },
        },
      }),
      prisma.$queryRaw<LanguageBreakdownRow[]>`
        SELECT s.language, COUNT(*)::int AS count
        FROM "Review" r
        JOIN "CodeSnippet" s ON s.id = r."snippetId"
        WHERE r."userId" = ${userId}::uuid
        GROUP BY s.language
        ORDER BY count DESC, s.language ASC
        LIMIT 5
      `,
      prisma.$queryRaw<LanguageCountRow[]>`
        SELECT COUNT(DISTINCT s.language)::int AS count
        FROM "Review" r
        JOIN "CodeSnippet" s ON s.id = r."snippetId"
        WHERE r."userId" = ${userId}::uuid
      `,
      prisma.$queryRaw<ScoreOverTimeRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', r."createdAt"), 'YYYY-MM-DD') AS date,
          ROUND(AVG(r.score)::numeric, 1)::float8 AS "avgScore"
        FROM "Review" r
        WHERE r."userId" = ${userId}::uuid
          AND r."createdAt" >= ${chartStart}
        GROUP BY DATE_TRUNC('day', r."createdAt")
        ORDER BY DATE_TRUNC('day', r."createdAt") ASC
      `,
      prisma.review.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          score: true,
          createdAt: true,
          source: true,
          snippet: {
            select: {
              id: true,
              filename: true,
              language: true,
              rawCode: true,
            },
          },
        },
      }),
    ]);

    response.status(200).json({
      totalReviews: reviewAggregate._count._all,
      averageScore: roundScore(reviewAggregate._avg.score),
      languagesUsed: languageCountRows[0]?.count ?? 0,
      languageBreakdown,
      reviewsThisWeek,
      scoreOverTime,
      recentReviews: recentReviews.map(toReviewSummary),
    });
  }),
);

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function roundScore(score: number | null) {
  return score === null ? 0 : Math.round(score * 10) / 10;
}

function toReviewSummary(review: {
  id: string;
  score: number;
  createdAt: Date;
  source: string;
  snippet: {
    id: string;
    filename: string;
    language: string;
    rawCode: string;
  };
}) {
  return {
    id: review.id,
    score: review.score,
    createdAt: review.createdAt,
    source: review.source,
    snippet: {
      ...review.snippet,
      rawCode: review.snippet.rawCode.slice(0, 200),
    },
  };
}
