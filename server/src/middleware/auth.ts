import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/tokens";

export const authMiddleware: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const token = authorization.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    request.user = {
      id: payload.id,
      email: payload.email,
      githubId: payload.githubId,
    };

    next();
  } catch {
    next(new AppError("Invalid access token", 401));
  }
};
