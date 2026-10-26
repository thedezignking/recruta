import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { listApplications, reviewApplication } from "./applications";

function client(data: unknown, message?: string) {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data, error: message ? { message } : null });
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}
describe("application services", () => {
  it("passes tenant and validated filters to the RLS-governed list", async () => {
    const cursor = { at: "2026-10-24T10:00:00Z", id: crypto.randomUUID() };
    const { supabase, rpc } = client({
      items: [],
      total: 28,
      nextCursor: cursor,
    });
    const result = await listApplications(supabase, "agency", {
      q: "Ada",
      owner: "mine",
    });
    expect(rpc).toHaveBeenCalledWith(
      "application_inbox",
      expect.objectContaining({
        p_agency_id: "agency",
        p_filters: expect.objectContaining({ q: "Ada", owner: "mine" }),
      }),
    );
    expect(result.total).toBe(28);
    const next = client({ items: [], total: 28, nextCursor: null });
    await listApplications(next.supabase, "agency", {
      cursor: result.nextCursor,
    });
    expect(next.rpc.mock.calls[0][1].p_filters).toMatchObject({
      cursorAt: cursor.at,
      cursorId: cursor.id,
    });
  });
  it("rejects malformed cursors before making a database call", async () => {
    const { supabase, rpc } = client(null);
    await expect(
      listApplications(supabase, "agency", { cursor: "garbage" }),
    ).rejects.toMatchObject({ code: "INVALID_CURSOR" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not turn query failures into an empty inbox", async () => {
    const { supabase } = client(null, "unavailable");
    await expect(listApplications(supabase, "agency")).rejects.toMatchObject({
      code: "APPLICATION_LIST_FAILED",
    });
  });
  it("sends the actor-scoped action, version, and request ID to the transaction", async () => {
    const { supabase, rpc } = client({ id: "application" });
    await reviewApplication(
      supabase,
      "agency",
      "application",
      {
        action: "transition",
        status: "in_review",
        expectedUpdatedAt: "2026-10-24T10:00:00Z",
      },
      "request-1",
    );
    expect(rpc).toHaveBeenCalledWith(
      "review_application",
      expect.objectContaining({
        p_agency_id: "agency",
        p_application_id: "application",
        p_action: "transition",
        p_expected_updated_at: "2026-10-24T10:00:00Z",
        p_request_id: "request-1",
      }),
    );
  });
  it.each([
    ["application_changed", "APPLICATION_CHANGED", 409],
    ["application_not_found", "APPLICATION_NOT_FOUND", 404],
    ["transition_reason_required", "REASON_REQUIRED", 422],
    ["permission_denied", "PERMISSION_DENIED", 403],
  ])("maps %s to an actionable API error", async (message, code, status) => {
    const { supabase } = client(null, message);
    await expect(
      reviewApplication(
        supabase,
        "agency",
        "application",
        { action: "note", noteId: crypto.randomUUID(), body: "A note" },
        "request",
      ),
    ).rejects.toMatchObject({ code, status });
  });
});
