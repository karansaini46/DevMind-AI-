import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import "./config/passport";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { docsRouter } from "./routes/docs";
import { githubWebhooksRouter } from "./routes/github-webhooks";
import { healthRouter } from "./routes/health";
import { reviewsRouter } from "./routes/reviews";
import { searchRouter } from "./routes/search";
import { settingsRouter } from "./routes/settings";
import { snippetsRouter } from "./routes/snippets";
import { env } from "./utils/env";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use("/webhooks/github", express.raw({ type: "application/json", limit: "2mb" }), githubWebhooksRouter);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/docs", docsRouter);
app.use("/reviews", reviewsRouter);
app.use("/search", searchRouter);
app.use("/settings", settingsRouter);
app.use("/snippets", snippetsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
