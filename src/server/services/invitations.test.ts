import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://recruta.example" }),
}));
vi.mock("@/server/email/resend", () => ({ sendApplicationEmail: vi.fn() }));
vi.mock("@/server/email/templates", () => ({
  statusEmail: vi.fn((input) => input.actionUrl),
}));
vi.mock("./communications", () => ({
  createPendingCommunication: vi.fn(),
  markCommunication: vi.fn(),
}));
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplicationEmail } from "@/server/email/resend";
import {
  createPendingCommunication,
  markCommunication,
} from "./communications";
import { inviteAgencyMember } from "./invitations";
const generateLink = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminClient).mockReturnValue({
    auth: { admin: { generateLink } },
  } as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(createPendingCommunication).mockResolvedValue({
    id: "delivery",
    status: "pending",
    attempt_count: 0,
    provider_message_id: null,
  });
  vi.mocked(sendApplicationEmail).mockResolvedValue("provider-id");
  generateLink.mockResolvedValue({
    data: { properties: { hashed_token: "synthetic-hash" } },
    error: null,
  });
});
function invite() {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: crypto.randomUUID(),
        email: "synthetic@example.invalid",
        role: "recruiter",
        expires_at: new Date().toISOString(),
      },
      error: null,
    }),
  };
  const db = { from: vi.fn(() => query) } as unknown as SupabaseClient;
  return inviteAgencyMember(
    db,
    { agencyId: crypto.randomUUID(), userId: crypto.randomUUID() },
    { email: "synthetic@example.invalid", role: "recruiter" },
    crypto.randomUUID(),
  );
}
it("delivers new-user invitations through the cookie-backed callback and password setup", async () => {
  await invite();
  const mail = vi.mocked(sendApplicationEmail).mock.calls[0][0];
  const callback = new URL(mail.html);
  expect(callback.pathname).toBe("/auth/callback");
  expect(callback.searchParams.get("token_hash")).toBe("synthetic-hash");
  expect(callback.searchParams.get("type")).toBe("invite");
  expect(callback.searchParams.get("next")).toMatch(/kind=agency&setup=1$/);
  expect(mail.idempotencyKey).toMatch(/^invitation:/);
});
it("uses a magic link for an existing account without forcing password setup", async () => {
  generateLink.mockResolvedValueOnce({
    data: null,
    error: { message: "User already registered" },
  });
  await invite();
  const callback = new URL(
    vi.mocked(sendApplicationEmail).mock.calls[0][0].html,
  );
  expect(generateLink.mock.calls[1][0].type).toBe("magiclink");
  expect(callback.searchParams.get("type")).toBe("magiclink");
  expect(callback.searchParams.get("next")).not.toContain("setup=1");
});
it("preserves the invitation when provider delivery fails", async () => {
  vi.mocked(sendApplicationEmail).mockRejectedValueOnce(
    new Error("Synthetic provider failure"),
  );
  const result = await invite();
  expect(result.invitation.id).toBeTruthy();
  expect(result.delivery.status).toBe("failed");
  expect(markCommunication).toHaveBeenCalledWith(
    "delivery",
    expect.objectContaining({ status: "failed" }),
  );
});
it("does not resend a delivery already recorded as sent", async () => {
  vi.mocked(createPendingCommunication).mockResolvedValueOnce({
    id: "delivery",
    status: "sent",
    attempt_count: 1,
    provider_message_id: "existing",
  });
  await invite();
  expect(generateLink).not.toHaveBeenCalled();
  expect(sendApplicationEmail).not.toHaveBeenCalled();
});
