import { defineConfig } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("Missing required environment variable: TURSO_DATABASE_URL");
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
