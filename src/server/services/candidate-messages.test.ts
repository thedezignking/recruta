import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./applications", () => ({
  getApplication: vi.fn().mockResolvedValue({ id: "app" }),
}));
import {
  processNextCandidateMessage,
  queueCandidateMessage,
} from "./candidate-messages";
beforeEach(() => {
  vi.stubEnv("RECRUTA_CANDIDATE_EMAIL_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "synthetic");
  vi.stubEnv("RECRUTA_EMAIL_FROM", "test@example.invalid");
  vi.stubEnv("AUTOMATION_WORKER_SECRET", "x".repeat(40));
});
function fixture() {
  const message = {
    id: "message",
    lease_token: "lease",
    recipient_email: "candidate@example.invalid",
    subject: "Hello",
    body: "<script>unsafe</script>",
    reply_to: "agency@example.invalid",
  };
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ data: [message], error: null })
    .mockResolvedValue({ data: true, error: null });
  return { rpc, db: { rpc } as unknown as SupabaseClient };
}
describe("durable candidate messages", () => {
  it("uses stable provider keys and safely renders user content", async () => {
    const f = fixture();
    const send = vi.fn().mockResolvedValue("provider-id");
    expect(await processNextCandidateMessage(f.db, send)).toMatchObject({
      processed: true,
      committed: true,
      failed: false,
    });
    expect(send.mock.calls[0][0]).toMatchObject({
      key: "recruta-message:message",
      replyTo: "agency@example.invalid",
    });
    expect(send.mock.calls[0][0].html).toContain("&lt;script&gt;");
    expect(send.mock.calls[0][0].html).not.toContain("<script>");
    expect(f.rpc.mock.calls[1][1]).toMatchObject({
      p_lease: "lease",
      p_provider_id: "provider-id",
    });
  });
  it("records provider failure without losing authoritative work or provider text", async () => {
    const f = fixture();
    const send = vi
      .fn()
      .mockRejectedValue(new Error("candidate secret provider output"));
    expect(await processNextCandidateMessage(f.db, send)).toMatchObject({
      processed: true,
      failed: true,
      committed: true,
    });
    expect(f.rpc.mock.calls[1][1]).toMatchObject({
      p_failure: "provider_unavailable",
      p_retryable: true,
    });
    expect(JSON.stringify(f.rpc.mock.calls)).not.toContain("candidate secret");
  });
  it("does not claim or transmit when email is disabled", async () => {
    vi.stubEnv("RECRUTA_CANDIDATE_EMAIL_ENABLED", "false");
    const f = fixture();
    const send = vi.fn();
    await expect(processNextCandidateMessage(f.db, send)).rejects.toMatchObject(
      { status: 503 },
    );
    expect(f.rpc).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("reports lost leases without saying delivery was saved", async () => {
    const f = fixture();
    f.rpc
      .mockReset()
      .mockResolvedValueOnce({
        data: [{ id: "message", lease_token: "lease" }],
        error: null,
      })
      .mockResolvedValue({ data: false, error: null });
    expect(
      await processNextCandidateMessage(
        f.db,
        vi.fn().mockResolvedValue("provider-id"),
      ),
    ).toMatchObject({ committed: false });
  });
  it("requires an idempotency key before enqueue", async () => {
    const db = { rpc: vi.fn() } as unknown as SupabaseClient;
    await expect(
      queueCandidateMessage(
        db,
        "agency",
        "app",
        { kind: "custom", subject: "Test", body: "Synthetic" },
        null,
        "request",
      ),
    ).rejects.toThrow();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
