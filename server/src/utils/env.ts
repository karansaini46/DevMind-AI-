import { config } from "dotenv";
import { z } from "zod";

config();
config({ path: "../.env", override: false });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
