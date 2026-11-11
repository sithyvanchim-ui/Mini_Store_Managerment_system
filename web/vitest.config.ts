import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Unit/component test configuration. Playwright specs live in `e2e/` and are
// intentionally excluded here — they are run by `playwright.config.ts`.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Components only need structure and text for these assertions; skipping
    // CSS keeps the suite fast and avoids Tailwind v4 processing in jsdom.
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
