export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  githubId: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SearchResult {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
  createdAt: string;
  content: string;
  distance: number;
}

export interface Snippet {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
  createdAt: string;
}

export interface AutoReview {
  id: string;
  snippetId: string;
  markdown: string;
  score: number;
  createdAt: string;
  source: "webhook";
  filename: string;
  language: string;
}

export type ReviewSource = "manual" | "webhook";

export interface ReviewSnippetPreview {
  id: string;
  filename: string;
  language: string;
  rawCode: string;
}

export interface ReviewSummary {
  id: string;
  score: number;
  createdAt: string;
  source: ReviewSource;
  snippet: ReviewSnippetPreview;
}

export interface ReviewListResponse {
  reviews: ReviewSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReviewDetail {
  id: string;
  score: number;
  createdAt: string;
  source: ReviewSource;
  feedbackMarkdown: string;
  snippet: Snippet;
}

export interface ReviewDetailResponse {
  review: ReviewDetail;
}

export interface DashboardStats {
  totalReviews: number;
  averageScore: number;
  languagesUsed: number;
  languageBreakdown: Array<{
    language: string;
    count: number;
  }>;
  reviewsThisWeek: number;
  scoreOverTime: Array<{
    date: string;
    avgScore: number;
  }>;
  recentReviews: ReviewSummary[];
}

export interface ReReviewResponse {
  reviewId: string;
  snippetId: string;
  markdown: string;
  score: number;
}

export interface Documentation {
  id: string;
  snippetId: string;
  commentedCode: string;
  readmeSection: string;
  language: string;
  createdAt: string;
}

export async function parseApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return body?.message ?? "Something went wrong";
}
