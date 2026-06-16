import { config } from "dotenv";
import { z } from "zod";

config();
config({ path: "../.env", override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z
    .string()
    .url()
    .default("http://localhost:5173")
    .transform((value) => new URL(value).origin),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  GITHUB_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(16, "GITHUB_TOKEN_ENCRYPTION_KEY must be at least 16 characters"),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:3000/auth/github/callback"),
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(8, "GITHUB_WEBHOOK_SECRET must be at least 8 characters"),
  WEBHOOK_URL: z
    .string()
    .url()
    .default("http://localhost:3000/webhooks/github"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export const env = envSchema.parse(process.env);
