// Invoke from an operator-managed scheduler. No schedule or provider is enabled here.
const base = process.env.RECRUTA_WORKER_BASE_URL;
if (!base || !/^https?:\/\//.test(base))
  throw new Error("Set RECRUTA_WORKER_BASE_URL to the deployment origin.");
const targets = [
  ["automations", process.env.AUTOMATION_WORKER_SECRET],
  ["messages", process.env.AUTOMATION_WORKER_SECRET],
  ["screening", process.env.SCREENING_WORKER_SECRET],
];
let failed = false;
for (const [name, secret] of targets) {
  if (!secret) {
    console.info(`${name}: not configured`);
    continue;
  }
  for (let count = 0; count < 10; count++) {
    try {
      const response = await fetch(new URL(`/api/internal/${name}`, base), {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(250000),
      });
      if (response.status === 503) {
        console.info(`${name}: disabled or temporarily unavailable`);
        break;
      }
      if (!response.ok) {
        console.error(`${name}: worker returned ${response.status}`);
        failed = true;
        break;
      }
      const result = await response.json();
      if (!result.data?.processed) break;
      if (result.data.failed) {
        console.error(`${name}: task reported a failure`);
        failed = true;
      }
    } catch {
      console.error(`${name}: worker connection failed`);
      failed = true;
      break;
    }
  }
}
if (failed) process.exitCode = 1;
