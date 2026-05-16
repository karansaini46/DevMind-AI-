import { config } from "dotenv";
import { z } from "zod";

config();
config({ path: "../.env", override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(1).default("development-jwt-secret"),
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  GITHUB_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .default("development-github-token-encryption-key"),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GITHUB_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:3000/auth/github/callback"),
  GEMINI_API_KEY: z.string().default(""),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_ACCESS_SECRET: parsedEnv.JWT_ACCESS_SECRET ?? parsedEnv.JWT_SECRET,
  JWT_REFRESH_SECRET: parsedEnv.JWT_REFRESH_SECRET ?? parsedEnv.JWT_SECRET,
};
