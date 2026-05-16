import { ChatGoogle } from "@langchain/google";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";

let reviewModel: ChatGoogle | null = null;

export function getReviewModel() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Review service is not configured", 503);
  }

  reviewModel ??= new ChatGoogle({
    model: "gemini-2.5-flash",
    apiKey: env.GEMINI_API_KEY,
  });

  return reviewModel;
}
