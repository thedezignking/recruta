import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listNotifications } from "./workspace-notifications";
function client(rows: Record<string, unknown[]>, fail = false) {
  const queries: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "gte", "order", "limit"])
      query[method] = vi.fn(() => query);
    query.then = (resolve: (result: unknown) => unknown) =>
      Promise.resolve({
        data: rows[table] ?? [],
        error: fail ? { message: "unavailable" } : null,
      }).then(resolve);
    queries[table] = query as (typeof queries)[string];
    return query;
  });
  return { supabase: { from } as unknown as SupabaseClient, queries };
}
describe("notification read service", () => {
  it("scopes all sources to the agency and assignments to the current user", async () => {
    const { supabase, queries } = client({
      applications: [
        {
          id: "a",
          candidate_id: "c",
          job_id: "j",
          submitted_at: "2026-10-24T09:00:00Z",
          candidates: { full_name: "Ada" },
          jobs: { title: "Designer" },
        },
      ],
      job_assignments: [
        {
          id: "b",
          job_id: "j",
          created_at: "2026-10-24T10:00:00Z",
          jobs: [{ title: "Designer" }],
        },
      ],
    });
    const result = await listNotifications(supabase, "agency", "user");
    for (const query of Object.values(queries))
      expect(query.eq).toHaveBeenCalledWith("agency_id", "agency");
    expect(queries.job_assignments.eq).toHaveBeenCalledWith("user_id", "user");
    expect(result.items.map((item) => item.kind)).toEqual([
      "assignment",
      "application",
    ]);
    expect(result.items[1].href).toBe("/app/applications/a");
  });
  it("does not disguise a database failure as no notifications", async () => {
    const { supabase } = client({}, true);
    await expect(
      listNotifications(supabase, "agency", "user"),
    ).rejects.toMatchObject({ code: "NOTIFICATIONS_UNAVAILABLE" });
  });
});
