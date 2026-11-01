import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

const create = vi.fn();
vi.mock("openai", () => ({
  default: class {
    responses = { create };
  },
}));

const getApplication = vi.fn();
vi.mock("@/server/services/applications", () => ({
  getApplication: (...args: unknown[]) => getApplication(...args),
  getApplicationMatch: vi.fn(async () => null),
  listApplications: vi.fn(async () => ({ total: 0, items: [] })),
}));
vi.mock("@/server/services/application-automations", () => ({
  getAttentionQueue: vi.fn(async () => []),
}));

const { runAssistant } = await import("./assistant");

const applicationId = "11111111-1111-4111-8111-111111111111";
const context = { supabase: {} as SupabaseClient, agencyId: "agency" };
const config = { apiKey: "test", model: "test-model", requestId: "req" };
const ask = [{ role: "user" as const, content: "Shortlist Ada" }];

function call(name: string, args: object) {
  return {
    output: [
      {
        type: "function_call",
        name,
        call_id: `call-${name}`,
        arguments: JSON.stringify(args),
      },
    ],
    output_text: "",
  };
}
const answer = (text: string) => ({
  output: [{ type: "message" }],
  output_text: text,
});

beforeEach(() => {
  create.mockReset();
  getApplication.mockReset();
  getApplication.mockResolvedValue({
    status: "in_review",
    updated_at: "2026-10-31T10:00:00Z",
    candidates: { full_name: "Ada Obi" },
    jobs: { title: "Finance analyst", clients: { name: "Acme" } },
  });
});

describe("runAssistant", () => {
  it("returns stage changes as proposals without changing anything", async () => {
    create
      .mockResolvedValueOnce(
        call("propose_stage_change", {
          applicationId,
          toStage: "shortlisted",
          reason: "",
        }),
      )
      .mockResolvedValueOnce(answer("Ready to shortlist Ada. Confirm below."));

    const reply = await runAssistant(context, ask, config);

    expect(reply.reply).toBe("Ready to shortlist Ada. Confirm below.");
    expect(reply.actions).toEqual([
      expect.objectContaining({
        type: "stage_change",
        applicationId,
        from: "in_review",
        to: "shortlisted",
        reasonRequired: false,
        expectedUpdatedAt: "2026-10-31T10:00:00Z",
      }),
    ]);
    expect(reply.trace).toEqual([
      expect.objectContaining({
        tool: "propose_stage_change",
        label: "Prepared a move to shortlisted",
        result: "Waiting for your confirmation",
        ok: true,
      }),
    ]);
    expect(reply.ms).toBeGreaterThanOrEqual(0);
    const request = create.mock.calls[1][0];
    expect(request.store).toBe(false);
    expect(request.input.at(-1)).toMatchObject({
      type: "function_call_output",
      call_id: "call-propose_stage_change",
    });
  });

  it("refuses transitions the workflow does not allow", async () => {
    create
      .mockResolvedValueOnce(
        call("propose_stage_change", {
          applicationId,
          toStage: "placed",
          reason: "",
        }),
      )
      .mockResolvedValueOnce(answer("That move isn't allowed."));

    const reply = await runAssistant(context, ask, config);

    expect(reply.actions).toEqual([]);
    // A refused step shows as failed in the trace, with its reason.
    expect(reply.trace[0]).toMatchObject({ ok: false });
    expect(reply.trace[0].result).toContain("Cannot move");
    expect(
      JSON.parse(create.mock.calls[1][0].input.at(-1).output),
    ).toHaveProperty("error");
  });

  it("stops after too many tool rounds", async () => {
    create.mockResolvedValue(call("list_needs_attention", {}));
    await expect(runAssistant(context, ask, config)).rejects.toMatchObject({
      code: "ASSISTANT_TOO_MANY_STEPS",
    });
    expect(create).toHaveBeenCalledTimes(6);
  });

  it("reports provider failures as unavailable", async () => {
    create.mockRejectedValue(new Error("network"));
    await expect(runAssistant(context, ask, config)).rejects.toMatchObject({
      status: 503,
      code: "ASSISTANT_UNAVAILABLE",
    });
  });
});
