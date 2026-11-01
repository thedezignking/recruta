import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { pipelineActionSchema } from "@/lib/pipeline";
import { managePipeline } from "./pipeline";

function client(data: unknown, error?: { message: string; code?: string }) {
  const rpc = vi.fn().mockResolvedValue({ data, error: error ?? null });
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}
const app = crypto.randomUUID();
const at = "2026-11-01T10:00:00.000Z";

describe("pipeline actions", () => {
  it("rejects an interview that ends before it starts", () => {
    expect(
      pipelineActionSchema.safeParse({
        action: "schedule_interview",
        id: crypto.randomUUID(),
        title: "First interview",
        startsAt: "2026-11-03T10:00:00Z",
        endsAt: "2026-11-03T09:00:00Z",
        timezone: "Africa/Lagos",
        format: "video",
      }).success,
    ).toBe(false);
  });

  it("needs a reason to decline but not to accept", () => {
    const id = crypto.randomUUID();
    expect(
      pipelineActionSchema.safeParse({
        action: "decide_offer",
        id,
        decision: "declined",
      }).success,
    ).toBe(false);
    expect(
      pipelineActionSchema.safeParse({
        action: "decide_offer",
        id,
        decision: "accepted",
        startDate: "2026-12-01",
      }).success,
    ).toBe(true);
  });

  it("sends the version check only for stage-changing actions", async () => {
    const { supabase, rpc } = client({ id: "x" });
    await managePipeline(
      supabase,
      "agency",
      app,
      {
        action: "record_placement",
        id: crypto.randomUUID(),
        offerId: crypto.randomUUID(),
        expectedUpdatedAt: at,
      },
      "req",
    );
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_action: "record_placement",
      p_expected_updated_at: at,
      p_agency_id: "agency",
    });
    const interview = client({ id: "y" });
    await managePipeline(
      interview.supabase,
      "agency",
      app,
      { action: "no_show_interview", id: crypto.randomUUID() },
      "req",
    );
    expect(interview.rpc.mock.calls[0][1].p_expected_updated_at).toBeNull();
  });

  it("maps database refusals to clear errors", async () => {
    const { supabase } = client(null, { message: "job_openings_filled" });
    await expect(
      managePipeline(
        supabase,
        "agency",
        app,
        {
          action: "record_placement",
          id: crypto.randomUUID(),
          offerId: crypto.randomUUID(),
          expectedUpdatedAt: at,
        },
        "req",
      ),
    ).rejects.toMatchObject({ status: 409, code: "OPENINGS_FILLED" });
    const duplicate = client(null, { message: "dup", code: "23505" });
    await expect(
      managePipeline(
        duplicate.supabase,
        "agency",
        app,
        { action: "save_offer", id: crypto.randomUUID() },
        "req",
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
