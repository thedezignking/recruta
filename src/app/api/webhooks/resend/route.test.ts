import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ verify: vi.fn(), rpc: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: mocks.verify };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
import { POST } from "./route";
beforeEach(() => {
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_synthetic");
  mocks.verify.mockReset();
  mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
});
it("rejects a forged callback without touching delivery records", async () => {
  mocks.verify.mockImplementation(() => {
    throw new Error("bad signature");
  });
  const response = await POST(
    new Request("https://example.invalid/api/webhooks/resend", {
      method: "POST",
      body: "{}",
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("verifies the unmodified raw body and suppresses only bounce/complaint", async () => {
  mocks.verify.mockReturnValue({
    type: "email.bounced",
    created_at: "2026-10-25T12:00:00Z",
    data: { email_id: "provider-id" },
  });
  const body = '{"synthetic":true}';
  const response = await POST(
    new Request("https://example.invalid/api/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": "event-id",
        "svix-timestamp": "123",
        "svix-signature": "signed",
      },
      body,
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.verify).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: body,
      headers: { id: "event-id", timestamp: "123", signature: "signed" },
    }),
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "record_email_event",
    expect.objectContaining({
      p_suppress: true,
      p_status: "permanent_failure",
    }),
  );
});
it("returns a retryable failure for callbacks that precede provider-ID persistence", async () => {
  mocks.verify.mockReturnValue({
    type: "email.delivered",
    created_at: "2026-10-25T12:00:00Z",
    data: { email_id: "provider-id" },
  });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect(
    (
      await POST(
        new Request("https://example.invalid/api/webhooks/resend", {
          method: "POST",
          headers: { "svix-id": "event" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(503);
});
