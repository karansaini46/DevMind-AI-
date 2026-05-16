import type { Response } from "express";
import { env } from "./env";

const refreshTokenCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function setRefreshTokenCookie(response: Response, token: string) {
  response.cookie("refreshToken", token, refreshTokenCookieOptions);
}

export function clearRefreshTokenCookie(response: Response) {
  response.clearCookie("refreshToken", refreshTokenCookieOptions);
}
