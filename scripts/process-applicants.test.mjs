import { test } from "node:test";
import assert from "node:assert/strict";
import { runApplicantWorkers } from "./process-applicants.mjs";

const secret = "synthetic-secret-".repeat(3);
function fixture(fetcher) {
  const errors = [];
  return {
    errors,
    options: {
      base: "https://example.invalid",
      automationSecret: secret,
      screeningSecret: `${secret}different`,
      fetcher,
      logger: { error: (message) => errors.push(message) },
    },
  };
}
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });
test("empty queues stop after one request and use the right credentials", async () => {
  const calls = [];
  const f = fixture(async (url, options) => {
    calls.push({ url: url.href, options });
    return response({ data: { processed: false } });
  });
  assert.deepEqual(await runApplicantWorkers(f.options), { failed: false });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.headers.authorization, `Bearer ${secret}`);
  assert.equal(
    calls[2].options.headers.authorization,
    `Bearer ${secret}different`,
  );
  assert.equal(calls[0].options.redirect, "error");
});
test("503 is a failure rather than a successful disabled tick", async () => {
  const f = fixture(async () =>
    response({ error: { code: "AUTOMATIONS_DISABLED" } }, 503),
  );
  assert.deepEqual(await runApplicantWorkers(f.options), { failed: true });
  assert.equal(f.errors.length, 3);
  assert.ok(!f.errors.join(" ").includes(secret));
});
test("processing is bounded and partial failures remain visible", async () => {
  let count = 0;
  const f = fixture(async () => {
    count++;
    return response({
      data: { processed: true, result: { committed: false } },
    });
  });
  assert.deepEqual(
    await runApplicantWorkers({ ...f.options, maxPerTarget: 2 }),
    { failed: true },
  );
  assert.equal(count, 6);
});
test("malformed responses, missing secrets and connection failures cannot pass", async () => {
  const f = fixture(async () => response({ data: { unexpected: true } }));
  assert.equal((await runApplicantWorkers(f.options)).failed, true);
  assert.equal(
    (await runApplicantWorkers({ ...f.options, automationSecret: "" })).failed,
    true,
  );
  const network = fixture(async () => {
    throw new Error(`private ${secret}`);
  });
  assert.equal((await runApplicantWorkers(network.options)).failed, true);
  assert.ok(!network.errors.join(" ").includes(secret));
});
test("invalid origins and batch sizes fail before transmitting credentials", async () => {
  const f = fixture(async () => {
    throw new Error("must not call");
  });
  for (const base of [
    "http://example.invalid",
    "https://user:pass@example.invalid",
    "https://example.invalid/path",
  ])
    await assert.rejects(runApplicantWorkers({ ...f.options, base }));
  await assert.rejects(
    runApplicantWorkers({ ...f.options, maxPerTarget: 100 }),
  );
});
