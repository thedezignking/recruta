import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./processing-settings", () => ({
  getProcessingSettings: vi
    .fn()
    .mockResolvedValue({ screeningEnabled: true, automaticScreening: true }),
}));
vi.mock("./screening", () => ({
  requireScreeningConfiguration: vi.fn(() => {
    throw new Error("disabled");
  }),
}));
import { processNextApplicationIntake } from "./application-automations";
beforeEach(() => {
  vi.stubEnv("RECRUTA_AUTOMATIONS_ENABLED", "true");
});
it("prepares receipts with AI disabled and reports partial failure to the runner", async () => {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({
      data: [{ id: "task", agency_id: "agency", lease_token: "lease" }],
      error: null,
    })
    .mockResolvedValueOnce({
      data: { committed: true, failed: true },
      error: null,
    });
  expect(
    await processNextApplicationIntake({ rpc } as unknown as SupabaseClient),
  ).toMatchObject({ processed: true, failed: true });
  expect(rpc).toHaveBeenCalledWith("prepare_application_intake", {
    p_id: "task",
    p_lease: "lease",
    p_model: null,
  });
  expect(rpc).toHaveBeenCalledTimes(2);
});
