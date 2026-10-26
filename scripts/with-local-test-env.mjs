import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const status = JSON.parse(
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["supabase", "status", "-o", "json"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ),
);
if (
  !status.API_URL?.startsWith("http://127.0.0.1:") ||
  !status.ANON_KEY ||
  !status.SERVICE_ROLE_KEY
)
  throw new Error("A complete disposable local Supabase stack is required.");
const env = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
  SUPABASE_SECRET_KEY: status.SERVICE_ROLE_KEY,
  RESEND_API_KEY: "re_local_disabled",
  RECRUTA_EMAIL_FROM: "Synthetic <test@example.invalid>",
  OPENAI_API_KEY: "",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_AUTH_TOKEN: "",
  BRANDFETCH_API_KEY: "",
  NEXT_PUBLIC_BRANDFETCH_CLIENT_ID: "",
  BRANDFETCH_PERSISTENCE_ALLOWED: "false",
  RECRUTA_AI_ENABLED: "false",
  RECRUTA_AI_DATA_USE_APPROVED: "false",
  RECRUTA_CANDIDATE_EMAIL_ENABLED: "false",
  RECRUTA_AUTOMATIONS_ENABLED: "false",
  SCREENING_WORKER_SECRET: randomBytes(32).toString("hex"),
  AUTOMATION_WORKER_SECRET: randomBytes(32).toString("hex"),
  RESEND_WEBHOOK_SECRET: "",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3001",
  RECRUTA_E2E_DATABASE: "1",
};
const mode = process.argv[2];
const args =
  mode === "build"
    ? ["node_modules/next/dist/bin/next", "build"]
    : mode === "start"
      ? ["node_modules/next/dist/bin/next", "start", "--port", "3001"]
      : mode === "test"
        ? [
            "node_modules/@playwright/test/cli.js",
            "test",
            "--workers=1",
            ...process.argv.slice(3),
          ]
        : mode === "e2e"
          ? [
              "node_modules/start-server-and-test/src/bin/start.js",
              "node node_modules/next/dist/bin/next start --port 3001",
              "http://127.0.0.1:3001",
              "node node_modules/@playwright/test/cli.js test --workers=1",
            ]
          : null;
if (!args) throw new Error("Choose build, start, test, or e2e.");
const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
