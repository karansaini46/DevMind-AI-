import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.originalUrl} not found`, 404));
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    // In production, strip detailed field paths to prevent reconnaissance.
    const issues =
      env.NODE_ENV === "production"
        ? error.issues.map((issue) => ({ message: issue.message }))
        : error.issues;

    response.status(400).json({
      message: "Validation failed",
      issues,
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  // Log unhandled errors with full context for debugging.
  logger.error({
    msg: "unhandled_error",
    err: error,
    method: request.method,
    path: request.originalUrl,
    requestId: request.headers["x-request-id"],
  });

  response.status(500).json({
    message: "Internal server error",
  });
};
