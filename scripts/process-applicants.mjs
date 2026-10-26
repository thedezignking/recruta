import { pathToFileURL } from "node:url";

// One bounded invocation per scheduler tick. Secrets never appear in output.
export async function runApplicantWorkers({
  base,
  automationSecret,
  screeningSecret,
  maxPerTarget = 2,
  fetcher = fetch,
  logger = console,
}) {
  const origin = new URL(base);
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/" ||
    (origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      ))
  )
    throw new Error("Use an HTTPS deployment origin or a local HTTP origin.");
  if (!Number.isInteger(maxPerTarget) || maxPerTarget < 1 || maxPerTarget > 10)
    throw new Error("Worker batch limit must be between 1 and 10.");
  let failed = false;
  for (const [name, secret] of [
    ["automations", automationSecret],
    ["messages", automationSecret],
    ["screening", screeningSecret],
  ]) {
    if (!secret || secret.length < 32) {
      logger.error(`${name}: worker secret is not configured`);
      failed = true;
      continue;
    }
    for (let count = 0; count < maxPerTarget; count++) {
      try {
        const response = await fetcher(
          new URL(`/api/internal/${name}`, origin),
          {
            method: "POST",
            headers: { authorization: `Bearer ${secret}` },
            redirect: "error",
            signal: AbortSignal.timeout(250000),
          },
        );
        if (!response.ok) {
          logger.error(`${name}: worker returned ${response.status}`);
          failed = true;
          break;
        }
        const result = await response.json();
        if (typeof result.data?.processed !== "boolean")
          throw new Error("invalid_response");
        if (!result.data.processed) break;
        if (
          result.data.failed ||
          result.data.committed === false ||
          result.data.result?.committed === false
        ) {
          logger.error(`${name}: task failed or lost its lease`);
          failed = true;
        }
      } catch {
        logger.error(`${name}: worker connection or response failed`);
        failed = true;
        break;
      }
    }
  }
  return { failed };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await runApplicantWorkers({
      base: process.env.RECRUTA_WORKER_BASE_URL,
      automationSecret: process.env.AUTOMATION_WORKER_SECRET,
      screeningSecret: process.env.SCREENING_WORKER_SECRET,
      maxPerTarget: Number(process.env.RECRUTA_WORKER_MAX_PER_TARGET ?? 2),
    });
    if (result.failed) process.exitCode = 1;
  } catch {
    console.error(
      "Worker configuration is invalid. Check origin, secrets, and batch limit.",
    );
    process.exitCode = 1;
  }
}
