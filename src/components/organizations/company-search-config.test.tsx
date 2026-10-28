// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));
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
vi.mock("@/server/services/applications", () => ({
  getJobPipeline: vi.fn().mockResolvedValue([]),
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
vi.mock("@/components/jobs/new-job-dialog", () => ({
  NewJobDialog: ({ lookupClientId }: { lookupClientId?: string }) => (
    <output>{lookupClientId}</output>
  ),
}));
vi.mock("@/server/services/jobs", () => ({
  listJobs: vi.fn().mockResolvedValue({ items: [] }),
  getJobsListSummary: vi.fn().mockResolvedValue({
    all: 0,
    open: 0,
    draft: 0,
    onHold: 0,
    filled: 0,
    closingSoon: 0,
  }),
  getJobsActivity: vi.fn().mockResolvedValue({
    periods: [],
    series: { open: [], positions: [], nearDeadline: [], filled: [] },
    previous: { open: 0, positions: 0, nearDeadline: 0, filled: 0 },
    counts: { open: 0, positions: 0, nearDeadline: 0, filled: 0 },
    comparisonLabel: "previous 30 days",
  }),
  getJobReviewProgress: vi.fn().mockResolvedValue(new Map()),
}));
import NewOrganizationPage from "@/app/(agency)/app/clients/new/page";
import JobsPage from "@/app/(agency)/app/jobs/page";
afterEach(cleanup);
it("enables standalone company search without the paid enrichment configuration", async () => {
  render(await NewOrganizationPage());
  expect(screen.getByText("public-client-id")).toBeTruthy();
});
it("also enables company search while opening a job", async () => {
  render(await JobsPage({ searchParams: Promise.resolve({ new: "1" }) }));
  expect(screen.getByText("public-client-id")).toBeTruthy();
});
