import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAgencyContext, requireAgencyPageContext } from "./context";
import { workspaceCookieName } from "@/lib/workspace-selection";

const state = vi.hoisted(() => ({
  userId: "10000000-0000-4000-8000-000000000001",
  first: "10000000-0000-4000-8000-000000000002",
  second: "10000000-0000-4000-8000-000000000003",
  outside: "10000000-0000-4000-8000-000000000004",
  cookie: undefined as string | undefined,
  memberships: [] as {
    agency_id: string;
    user_id: string;
    role: string;
    status: string;
    agencies: { status: string };
  }[],
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === `recruta-workspace-${state.userId}` && state.cookie
        ? { value: state.cookie }
        : undefined,
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: state.userId } },
        error: null,
      }),
    },
    from: () => {
      let rows = [...state.memberships];
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          rows = rows.filter(
            (row) =>
              (key === "agencies.status"
                ? row.agencies.status
                : row[key as keyof typeof row]) === value,
          );
          return query;
        },
        order: () => query,
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve(resolve({ data: rows, error: null })),
      };
      return query;
    },
  }),
}));
beforeEach(() => {
  state.cookie = undefined;
  state.memberships = [
    {
      agency_id: state.first,
      user_id: state.userId,
      role: "owner",
      status: "active",
      agencies: { status: "active" },
    },
    {
      agency_id: state.second,
      user_id: state.userId,
      role: "recruiter",
      status: "active",
      agencies: { status: "active" },
    },
  ];
});
const request = (agencyId?: string) =>
  new Request("https://recruta.example/api/v1/jobs", {
    headers: agencyId ? { "x-agency-id": agencyId } : {},
  });
describe("workspace authorization context", () => {
  it("uses the same default membership for pages and API requests", async () => {
    expect((await requireAgencyContext(request())).agencyId).toBe(state.first);
    expect((await requireAgencyPageContext()).agencyId).toBe(state.first);
  });
  it("uses a user-scoped preference but reads roles from active database memberships", async () => {
    state.cookie = state.second;
    expect(workspaceCookieName(state.userId)).toContain(state.userId);
    expect(await requireAgencyContext(request())).toMatchObject({
      agencyId: state.second,
      role: "recruiter",
    });
    expect((await requireAgencyPageContext()).agencyId).toBe(state.second);
    await expect(
      requireAgencyContext(request(), ["owner"]),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("never treats a forged cookie as authorization", async () => {
    state.cookie = state.outside;
    expect((await requireAgencyContext(request())).agencyId).toBe(state.first);
    expect((await requireAgencyPageContext()).agencyId).toBe(state.first);
    await expect(
      requireAgencyContext(request(state.outside)),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("honors explicit verified agency headers and rejects malformed ones", async () => {
    state.cookie = state.second;
    expect((await requireAgencyContext(request(state.first))).agencyId).toBe(
      state.first,
    );
    await expect(
      requireAgencyContext(request("invalid")),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("removes revoked and suspended-workspace access immediately", async () => {
    state.cookie = state.second;
    state.memberships[1].status = "revoked";
    expect((await requireAgencyContext(request())).agencyId).toBe(state.first);
    await expect(
      requireAgencyContext(request(state.second)),
    ).rejects.toMatchObject({ status: 403 });
    state.memberships[0].agencies.status = "suspended";
    await expect(requireAgencyPageContext()).rejects.toMatchObject({
      status: 403,
    });
  });
});
