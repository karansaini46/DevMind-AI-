import { ChatGoogle } from "@langchain/google";
import { AppError } from "../utils/app-error";
import { env } from "../utils/env";

let textModel: ChatGoogle | null = null;

export function getTextModel() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Text generation service is not configured", 503);
  }

  textModel ??= new ChatGoogle({
    model: "gemini-2.5-flash",
    apiKey: env.GEMINI_API_KEY,
  });

  return textModel;
}

export function getReviewModel() {
  return getTextModel();
}
