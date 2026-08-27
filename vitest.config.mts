import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // jsdom rather than node: Turndown needs a DOM parser, and several ops touch
    // browser globals that only exist in a document context.
    environment: "jsdom",
    // Date output depends on the machine's zone; pin it so results are stable.
    env: { TZ: "UTC" },
    globals: true,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
});
