import { app } from "./app";
import { closeReviewQueue } from "./jobs/reviewQueue";
import { closeReviewWorker, startReviewWorker } from "./jobs/reviewWorker";
import { env } from "./utils/env";
import { logger } from "./utils/logger";

startReviewWorker();

const server = app.listen(env.PORT, () => {
  logger.info({ msg: "server_started", port: env.PORT });
});

async function shutdown() {
  logger.info({ msg: "server_shutting_down" });
  await Promise.all([closeReviewWorker(), closeReviewQueue()]);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
