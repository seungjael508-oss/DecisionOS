import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // Vercel production builds export NODE_ENV=production; React act requires the test build.
    env: { NODE_ENV: "test" },
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      // Synthetic receipt mutations must use the same source as the code under test.
      // These aliases apply only to Vitest, never to the production build.
      "@/lib/move-in/payment-projection-source.server": path.join(rootDir, "tests/fixtures/payment-source-empty.ts"),
      "./payment-projection-source.server": path.join(rootDir, "tests/fixtures/payment-source-empty.ts"),
      "@/lib/move-in/ledger-finance-data.server": path.join(rootDir, "tests/fixtures/ledger-finance-empty.ts"),
      "@": path.join(rootDir, "src"),
    },
  },
});
