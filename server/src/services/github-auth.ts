import type { Profile } from "passport-github2";
import { prisma } from "../lib/prisma";
import type { GitHubOAuthState } from "../types/auth";
import { AppError } from "../utils/app-error";
import { encryptGitHubAccessToken } from "../utils/github-token-crypto";
import { env } from "../utils/env";
import {
  signOAuthStateToken,
  verifyOAuthStateToken,
} from "../utils/tokens";

interface ResolveGitHubUserInput {
  accessToken: string;
  profile: Profile;
  state: GitHubOAuthState;
}

export function createOAuthState(state: GitHubOAuthState) {
  return signOAuthStateToken(state);
}

export function verifyOAuthState(token: string) {
  return verifyOAuthStateToken(token);
}

export function buildGitHubAuthorizationUrl(state: string) {
  const authorizationUrl = new URL("https://github.com/login/oauth/authorize");
  authorizationUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  authorizationUrl.searchParams.set("scope", "user:email repo admin:repo_hook");
  authorizationUrl.searchParams.set("state", state);
  return authorizationUrl.toString();
}

export async function resolveGitHubUser({
  accessToken,
  profile,
  state,
}: ResolveGitHubUserInput) {
  const githubId = profile.id;
  const githubUsername = profile.username ?? null;
  const githubAvatarUrl = profile.photos?.[0]?.value ?? null;
  const email = profile.emails?.[0]?.value?.trim().toLowerCase() ?? null;
  const name =
    profile.displayName?.trim() ||
    profile.username?.trim() ||
    `github-${profile.id}`;
  const githubAccessToken = encryptGitHubAccessToken(accessToken);

  if (state.mode === "connect") {
    const user = await prisma.user.findUnique({
      where: { id: state.userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const existingGitHubUser = await prisma.user.findUnique({
      where: { githubId },
    });

    if (existingGitHubUser && existingGitHubUser.id !== user.id) {
      throw new AppError("GitHub account is already connected", 409);
    }

    if (user.githubId && user.githubId !== githubId) {
      throw new AppError("A different GitHub account is already connected", 409);
    }

    return prisma.user.update({
      where: { id: user.id },
      data: {
        githubId,
        githubUsername,
        githubAvatarUrl,
        githubAccessToken,
        email: user.email ?? email,
      },
    });
  }

  const existingGitHubUser = await prisma.user.findUnique({
    where: { githubId },
  });

  if (existingGitHubUser) {
    return prisma.user.update({
      where: { id: existingGitHubUser.id },
      data: {
        githubUsername,
        githubAvatarUrl,
        githubAccessToken,
        email: existingGitHubUser.email ?? email,
      },
    });
  }

  if (email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      throw new AppError(
        "An account with this email already exists. Sign in and connect GitHub from your dashboard.",
        409,
      );
    }
  }

  return prisma.user.create({
    data: {
      email,
      passwordHash: null,
      name,
      githubId,
      githubUsername,
      githubAvatarUrl,
      githubAccessToken,
    },
  });
}
