import bcrypt from "bcrypt";
import { Router, type Response } from "express";
import passport from "passport";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  buildGitHubAuthorizationUrl,
  createOAuthState,
  resolveGitHubUser,
  verifyOAuthState,
} from "../services/github-auth";
import type { GitHubOAuthResult } from "../types/auth";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../utils/cookies";
import { env } from "../utils/env";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";
import { toAuthUser } from "../utils/users";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
      },
    });

    const accessToken = signAccessToken(user);
    setRefreshTokenCookie(response, signRefreshToken(user));

    response.status(201).json({
      accessToken,
      user: toAuthUser(user),
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user?.passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = signAccessToken(user);
    setRefreshTokenCookie(response, signRefreshToken(user));

    response.status(200).json({
      accessToken,
      user: toAuthUser(user),
    });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    const refreshToken = request.cookies.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new AppError("Refresh token is invalid", 401);
    }

    response.status(200).json({
      accessToken: signAccessToken(user),
      user: toAuthUser(user),
    });
  }),
);

authRouter.post("/logout", (_request, response) => {
  clearRefreshTokenCookie(response);
  response.status(204).send();
});

authRouter.get(
  "/me",
  authMiddleware,
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    response.status(200).json({
      user: toAuthUser(user),
    });
  }),
);

authRouter.get("/github", (_request, response) => {
  ensureGitHubConfigured();
  const state = createOAuthState({ mode: "login" });
  response.redirect(buildGitHubAuthorizationUrl(state));
});

authRouter.post("/github/connect", authMiddleware, (request, response) => {
  ensureGitHubConfigured();
  const state = createOAuthState({
    mode: "connect",
    userId: request.user!.id,
  });

  response.status(200).json({
    url: buildGitHubAuthorizationUrl(state),
  });
});

authRouter.get("/github/callback", (request, response, next) => {
  if (request.query.error) {
    redirectWithOAuthError(response, String(request.query.error));
    return;
  }

  const stateToken = request.query.state;

  if (typeof stateToken !== "string") {
    redirectWithOAuthError(response, "missing_state");
    return;
  }

  let state;

  try {
    state = verifyOAuthState(stateToken);
  } catch {
    redirectWithOAuthError(response, "invalid_state");
    return;
  }

  passport.authenticate(
    "github",
    { session: false },
    async (error: unknown, result?: GitHubOAuthResult) => {
      try {
        if (error || !result) {
          redirectWithOAuthError(response, "github_auth_failed");
          return;
        }

        const user = await resolveGitHubUser({
          accessToken: result.accessToken,
          profile: result.profile,
          state,
        });

        const accessToken = signAccessToken(user);
        setRefreshTokenCookie(response, signRefreshToken(user));

        const redirectUrl = new URL("/auth/success", env.CLIENT_URL);
        redirectUrl.searchParams.set("token", accessToken);
        response.redirect(redirectUrl.toString());
      } catch (callbackError) {
        if (callbackError instanceof AppError) {
          redirectWithOAuthError(response, callbackError.message);
          return;
        }

        next(callbackError);
      }
    },
  )(request, response, next);
});

function ensureGitHubConfigured() {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new AppError("GitHub OAuth is not configured", 503);
  }
}

function redirectWithOAuthError(response: Response, error: string) {
  const redirectUrl = new URL("/login", env.CLIENT_URL);
  redirectUrl.searchParams.set("oauthError", error);
  response.redirect(redirectUrl.toString());
}
