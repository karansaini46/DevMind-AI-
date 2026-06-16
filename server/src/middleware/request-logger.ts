import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { logger } from "../utils/logger";

/**
 * Logs every HTTP request with method, path, status code, and duration.
 * Attaches a unique request ID for log correlation.
 */
export const requestLogger: RequestHandler = (request, response, next) => {
  const requestId = randomUUID();
  const start = Date.now();

  request.headers["x-request-id"] ??= requestId;
  response.setHeader("X-Request-Id", request.headers["x-request-id"]);

  response.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      msg: "request",
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      duration,
      ip: request.ip,
      requestId: request.headers["x-request-id"],
    });
  });

  next();
};
