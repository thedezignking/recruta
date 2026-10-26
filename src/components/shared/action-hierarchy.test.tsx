// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/auth/context", () => ({
  requireAgencyPageContext: vi
    .fn()
    .mockResolvedValue({ supabase: {}, agencyId: "agency" }),
}));
vi.mock("@/server/services/jobs", () => ({
  listJobs: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("@/server/services/workspace", () => ({
  listAgencyMembers: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("@/server/services/public-jobs", () => ({
  getPublicJob: vi.fn().mockResolvedValue({
    agencies: { name: "Synthetic Talent" },
    clients: { name: "Example Organization" },
    title: "Designer",
    salary_min: null,
    salary_max: null,
    currency: "NGN",
    location: "Lagos",
    employment_type: "Full-time",
    deadline_at: null,
    description: "Design accessible products.",
    job_requirements: [],
    work_arrangement: "remote",
    application_form_intro: null,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
import JobsPage from "@/app/(agency)/app/jobs/page";
import PublicJobPage from "@/app/careers/[agencySlug]/jobs/[jobSlug]/page";
import { PortalRequestActions } from "@/components/portal/request-actions";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";

afterEach(cleanup);

function expectOutline(element: HTMLElement) {
  expect(element.className).toContain("border-border");
  expect(element.className).not.toContain("bg-primary");
  expect(element.className).not.toContain("bg-secondary");
}

describe("action hierarchy", () => {
  it("keeps New job primary and the Jobs empty-state action outline", async () => {
    render(await JobsPage());
    expect(screen.getByRole("link", { name: "New job" }).className).toContain(
      "bg-primary",
    );
    expectOutline(screen.getByRole("link", { name: "Create your first job" }));
  });
  it("keeps the Overview empty-state action outline", () => {
    render(
      <WorkspaceOverview
        timezone="Africa/Lagos"
        work={{
          totalJobs: 0,
          publishedJobs: 0,
          activeJobs: [],
          draft: null,
          shareable: null,
        }}
        role="owner"
        applicationBaseUrl="https://example.invalid/careers/test"
        overview={{
          counts: {
            openJobs: 0,
            applicationsToReview: 0,
            activeRequests: 0,
            organizations: 0,
            applicationsReceived: 0,
            inReview: 0,
            shortlisted: 0,
          },
          summaryCounts: {
            openJobs: 0,
            inReview: 0,
            shortlisted: 0,
            applicationsReceived: 0,
          },
          applications: [],
          requests: [],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "New job" }).className).toContain(
      "bg-primary",
    );
    expectOutline(screen.getByRole("link", { name: "Create job" }));
    const cards = within(
      screen.getByRole("region", { name: "Recruitment summary" }),
    ).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "View all active jobs",
      "View all applications received",
      "View all in review",
      "View all shortlisted",
    ]);
    expect(cards[2].getAttribute("href")).toBe(
      "/app/applications?status=in_review",
    );
    expect(cards[3].getAttribute("href")).toBe(
      "/app/applications?status=shortlisted",
    );
    expect(screen.queryByText(/Current workload/)).toBeNull();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(
      cards[2].querySelector(".solar-document-text-linear"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("combobox", { name: "Summary date range" })
        .parentElement?.parentElement?.contains(
          screen.getByRole("link", { name: "New job" }),
        ),
    ).toBe(true);
    expect(screen.queryByText("Applications to review")).toBeNull();
  });
  it("keeps request submission primary and supporting cancellation outline", () => {
    render(
      <PortalRequestActions
        clientId="client"
        requestId="request"
        status="draft"
      />,
    );
    expectOutline(screen.getByRole("button", { name: "Cancel request" }));
    expect(
      screen.getByRole("button", { name: "Submit request" }).className,
    ).toContain("bg-primary");
  });
  it("keeps the public hero Apply primary and repeated sidebar Apply outline", async () => {
    render(
      await PublicJobPage({
        params: Promise.resolve({
          agencySlug: "synthetic",
          jobSlug: "designer",
        }),
      }),
    );
    const main = screen.getByRole("link", { name: "Apply now" });
    const repeated = screen.getByRole("link", { name: "Apply for this role" });
    expect(main.className).toContain("bg-primary");
    expectOutline(repeated);
    expect(repeated.getAttribute("href")).toBe(main.getAttribute("href"));
  });
});
