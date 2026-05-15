import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();
config({ path: "../.env", override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
