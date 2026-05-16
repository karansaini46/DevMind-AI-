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

export async function parseApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return body?.message ?? "Something went wrong";
}
