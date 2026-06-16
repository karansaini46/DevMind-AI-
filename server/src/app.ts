import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import "./config/passport";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { globalLimiter, webhookLimiter } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { authRouter } from "./routes/auth";
import { githubWebhooksRouter } from "./routes/github-webhooks";
import { healthRouter } from "./routes/health";
import { reviewsRouter } from "./routes/reviews";
import { searchRouter } from "./routes/search";
import { settingsRouter } from "./routes/settings";
import { snippetsRouter } from "./routes/snippets";
import { env } from "./utils/env";

export const app = express();

// Trust first proxy (Render, Railway, Vercel, etc.) so rate limiter
// sees the real client IP instead of the proxy's IP.
app.set("trust proxy", 1);

// Security headers with explicit Content-Security-Policy.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", env.CLIENT_URL],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Request logging — gives every request a unique ID and logs method/path/status/duration.
app.use(requestLogger);

// Global rate limiter — 100 requests per 15 minutes per IP.
app.use(globalLimiter);

// Webhook route MUST come before express.json() because it needs raw body for signature verification.
// Has its own stricter rate limiter (60/min).
app.use("/webhooks/github", webhookLimiter, express.raw({ type: "application/json", limit: "2mb" }), githubWebhooksRouter);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/reviews", reviewsRouter);
app.use("/search", searchRouter);
app.use("/settings", settingsRouter);
app.use("/snippets", snippetsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
