import type { Profile } from "passport-github2";

export interface AuthTokenPayload {
  id: string;
  email: string | null;
  githubId: string | null;
}

export type GitHubOAuthState =
  | {
      mode: "login";
    }
  | {
      mode: "connect";
      userId: string;
    };

export interface GitHubOAuthResult {
  accessToken: string;
  profile: Profile;
}
