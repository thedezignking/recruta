// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/server/auth/context", () => ({
  requireAgencyPageContext: vi.fn().mockResolvedValue({
    supabase: {},
    agencyId: "agency",
    user: { id: "user" },
  }),
}));
vi.mock("@/server/services/clients", () => ({
  listClients: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("@/server/services/workspace", () => ({
  listAgencyMembers: vi.fn().mockResolvedValue({ items: [] }),
  listWorkflowTemplates: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("@/lib/env", () => ({
  getCompanyLookupEnv: () => ({
    clientId: "public-client-id",
    apiKey: undefined,
    persistenceAllowed: false,
  }),
}));
vi.mock("@/components/organizations/new-organization-form", () => ({
  NewOrganizationForm: ({ lookupClientId }: { lookupClientId?: string }) => (
    <output>{lookupClientId}</output>
  ),
}));
vi.mock("@/components/jobs/new-job-form", () => ({
  NewJobForm: ({ lookupClientId }: { lookupClientId?: string }) => (
    <output>{lookupClientId}</output>
  ),
}));
import NewOrganizationPage from "@/app/(agency)/app/clients/new/page";
import NewJobPage from "@/app/(agency)/app/jobs/new/page";
afterEach(cleanup);
it("enables standalone company search without the paid enrichment configuration", async () => {
  render(await NewOrganizationPage());
  expect(screen.getByRole("status").textContent).toBe("public-client-id");
});
it("also enables company search while opening a job", async () => {
  render(await NewJobPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("status").textContent).toBe("public-client-id");
});
