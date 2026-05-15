import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";
import { AppError } from "../utils/app-error";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.originalUrl} not found`, 404));
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  response.status(500).json({
    message: "Internal server error",
  });
};
