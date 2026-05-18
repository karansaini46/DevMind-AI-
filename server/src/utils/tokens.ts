import type { User } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthTokenPayload, GitHubOAuthState } from "../types/auth";
import { env } from "./env";

interface AppJwtPayload extends JwtPayload {
  email: string | null;
  githubId: string | null;
  kind: "access" | "refresh";
}

interface OAuthStateJwtPayload extends JwtPayload {
  mode: GitHubOAuthState["mode"];
  userId?: string;
  kind: "github_oauth_state";
}

export function signAccessToken(user: User) {
  return jwt.sign(
    {
      email: user.email,
      githubId: user.githubId,
      kind: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.id,
      expiresIn: "15m",
    },
  );
}

export function signRefreshToken(user: User) {
  return jwt.sign(
    {
      email: user.email,
      githubId: user.githubId,
      kind: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: user.id,
      expiresIn: "7d",
    },
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const payload = verifyAppToken(token, env.JWT_ACCESS_SECRET, "access");

  return {
    id: payload.sub!,
    email: payload.email,
    githubId: payload.githubId,
  };
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const payload = verifyAppToken(token, env.JWT_REFRESH_SECRET, "refresh");

  return {
    id: payload.sub!,
    email: payload.email,
    githubId: payload.githubId,
  };
}

export function signOAuthStateToken(state: GitHubOAuthState) {
  return jwt.sign(
    {
      ...state,
      kind: "github_oauth_state",
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: "10m",
    },
  );
}

export function verifyOAuthStateToken(token: string): GitHubOAuthState {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as OAuthStateJwtPayload;

  if (payload.kind !== "github_oauth_state") {
    throw new Error("Invalid OAuth state token");
  }

  if (payload.mode === "connect") {
    if (!payload.userId) {
      throw new Error("Missing OAuth state user");
    }

    return {
      mode: "connect",
      userId: payload.userId,
    };
  }

  if (payload.mode === "login") {
    return {
      mode: "login",
    };
  }

  throw new Error("Invalid OAuth state mode");
}

function verifyAppToken(
  token: string,
  secret: string,
  expectedKind: AppJwtPayload["kind"],
) {
  const payload = jwt.verify(token, secret) as AppJwtPayload;

  if (payload.kind !== expectedKind || !payload.sub) {
    throw new Error("Invalid token");
  }

  return payload;
}
