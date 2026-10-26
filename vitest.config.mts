import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    pool: process.platform === "win32" ? "threads" : "forks",
    maxWorkers: process.platform === "win32" ? 2 : undefined,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: { reporter: ["text", "json", "html"] },
  },
});
