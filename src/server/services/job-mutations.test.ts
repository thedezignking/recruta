import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assignJob,
  deleteEmptyManualJob,
  publishJob,
  transitionJob,
} from "./jobs";
import { convertHiringRequest } from "./hiring-requests";
import { jobAuthorizationError } from "./job-mutation-access";

function database(found = true, lookupError = false) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: found ? { id: "job" } : null,
      error: lookupError ? { message: "offline" } : null,
    }),
  };
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: null, error: { message: "permission_denied" } });
  return {
    supabase: { from: vi.fn(() => query), rpc } as unknown as SupabaseClient,
    query,
    rpc,
  };
}

const operations = [
  (db: SupabaseClient) => publishJob(db, "agency", "job", "request"),
  (db: SupabaseClient) => assignJob(db, "agency", "job", {}, "request"),
  (db: SupabaseClient) => transitionJob(db, "agency", "job", {}, "request"),
  (db: SupabaseClient) => deleteEmptyManualJob(db, "agency", "job", "request"),
  (db: SupabaseClient) =>
    convertHiringRequest(db, "agency", "job", {}, "request"),
];

describe("job mutation workspace boundary", () => {
  it.each(operations)(
    "refuses an out-of-workspace or RLS-hidden resource before invoking a mutation",
    async (operation) => {
      const { supabase, query, rpc } = database(false);
      await expect(operation(supabase)).rejects.toMatchObject({
        status: 404,
        code: "RESOURCE_NOT_FOUND",
      });
      expect(query.eq).toHaveBeenCalledWith("agency_id", "agency");
      expect(query.eq).toHaveBeenCalledWith("id", "job");
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("does not report database lookup failure as missing data", async () => {
    const { supabase, rpc } = database(false, true);
    await expect(
      deleteEmptyManualJob(supabase, "agency", "job", "request"),
    ).rejects.toMatchObject({ status: 500, code: "RESOURCE_LOOKUP_FAILED" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("preserves database authorization as the final check after a tenant match", async () => {
    const { supabase, rpc } = database();
    await expect(
      transitionJob(
        supabase,
        "agency",
        "job",
        { status: "on_hold" },
        "request",
      ),
    ).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
    expect(rpc).toHaveBeenCalledWith(
      "transition_job",
      expect.objectContaining({
        p_job_id: "job",
        p_request_id_header: "request",
      }),
    );
  });
  it.each([
    [{ message: "permission_denied" }, 403],
    [{ message: "permission denied for function", code: "42501" }, 403],
    [{ message: "authentication_required" }, 401],
  ])(
    "maps boundary failures without leaking database internals",
    (error, status) => {
      expect(jobAuthorizationError(error)).toMatchObject({ status });
    },
  );
});
