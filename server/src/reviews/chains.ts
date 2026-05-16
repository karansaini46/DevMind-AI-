import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { getReviewModel } from "./client";

export interface ReviewInput {
  code: string;
  language: string;
  filename: string;
}

const reviewPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an expert senior software engineer performing a code review. Be specific, constructive, and educational. Format your response in markdown.",
  ],
  [
    "human",
    [
      "Review this {language} code. Filename: {filename}",
      "",
      "```{language}",
      "{code}",
      "```",
      "",
      "Provide:",
      "1) Overall quality score out of 10",
      "2) List of bugs or issues found",
      "3) Security concerns",
      "4) Performance suggestions",
      "5) Code style and best practices",
      "6) A refactored version of the code with improvements",
    ].join("\n"),
  ],
]);

const scorePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an expert senior software engineer scoring a code review. Return a whole-number quality score from 0 to 10.",
  ],
  [
    "human",
    [
      "Score this {language} code. Filename: {filename}",
      "",
      "```{language}",
      "{code}",
      "```",
    ].join("\n"),
  ],
]);

const scoreSchema = z.object({
  score: z.number().int().min(0).max(10),
});

export async function streamReview(input: ReviewInput) {
  return reviewPrompt.pipe(getReviewModel()).pipe(new StringOutputParser()).stream(input);
}

export async function createReview(input: ReviewInput) {
  return reviewPrompt.pipe(getReviewModel()).pipe(new StringOutputParser()).invoke(input);
}

export async function scoreReview(input: ReviewInput) {
  const result = await scorePrompt
    .pipe(getReviewModel().withStructuredOutput(scoreSchema))
    .invoke(input);

  return scoreSchema.parse(result).score;
}
