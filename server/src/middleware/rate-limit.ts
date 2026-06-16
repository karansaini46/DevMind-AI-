import rateLimit from "express-rate-limit";

/**
 * Global API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, try again later" },
});

/**
 * Strict limiter for authentication endpoints (login, register).
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, try again later" },
});

/**
 * Limiter for review creation endpoints.
 * 20 requests per 15 minutes per IP.
 */
export const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Review rate limit reached, try again later" },
});

/**
 * Limiter for webhook endpoints.
 * 60 requests per minute per IP (GitHub sends bursts on push events).
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Webhook rate limit reached" },
});
