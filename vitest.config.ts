import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" unconditionally throws when imported outside Next.js's
      // "react-server" resolve condition (which Vitest doesn't set). Alias it
      // to its own no-op "empty.js" export so server-only modules are
      // importable in tests.
      "server-only": path.resolve(
        __dirname,
        "./node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
