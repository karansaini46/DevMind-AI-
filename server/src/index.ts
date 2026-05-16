import { app } from "./app";
import { closeReviewQueue } from "./jobs/reviewQueue";
import { closeReviewWorker, startReviewWorker } from "./jobs/reviewWorker";
import { env } from "./utils/env";

startReviewWorker();

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

async function shutdown() {
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
