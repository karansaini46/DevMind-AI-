import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { GitHubOAuthResult } from "../types/auth";
import { env } from "../utils/env";

type GitHubVerify = (
  accessToken: string,
  refreshToken: string,
  profile: GitHubOAuthResult["profile"],
  done: (error: unknown, user?: Express.User | false | null) => void,
) => void;

const verifyGitHubProfile: GitHubVerify = (
  accessToken,
  _refreshToken,
  profile,
  done,
) => {
  const result: GitHubOAuthResult = {
    accessToken,
    profile: profile as GitHubOAuthResult["profile"],
  };

  done(null, result as unknown as Express.User);
};

passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: env.GITHUB_CALLBACK_URL,
    },
    verifyGitHubProfile,
  ),
);
