import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health";
import { env } from "./utils/env";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
