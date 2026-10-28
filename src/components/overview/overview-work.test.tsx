// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OverviewWork, type OverviewWorkProps } from "./overview-work";

afterEach(cleanup);
function fixture(): OverviewWorkProps {
  return {
    role: "owner",
    agencyId: "agency",
    userId: "user",
    timezone: "Africa/Lagos",
    applicationBaseUrl: "https://example.invalid/careers/test",
    attention: [],
    work: {
      totalJobs: 0,
      publishedJobs: 0,
      activeJobs: [],
      draft: null,
      shareable: null,
    },
    overview: {
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
        applicationsReceived: 0,
        inReview: 0,
        shortlisted: 0,
      },
      applications: [],
      requests: [],
    },
  };
}
it("uses one starting point with no dependent empty panels", () => {
  render(<OverviewWork {...fixture()} />);
  expect(screen.getByRole("region", { name: "Start hiring" })).toBeTruthy();
  expect(screen.getByText("Open your first job")).toBeTruthy();
  expect(
    screen.queryByRole("region", { name: "Application inbox" }),
  ).toBeNull();
  expect(screen.queryByText("Needs attention")).toBeNull();
  expect(screen.queryByText("Hiring requests")).toBeNull();
  expect(screen.queryByText("Up next")).toBeNull();
});
it("shows draft continuation without suggesting a nonexistent application link", () => {
  const props = fixture();
  props.work.totalJobs = 1;
  props.work.draft = { id: "draft", title: "Designer" };
  render(<OverviewWork {...props} />);
  expect(
    screen.getByRole("link", { name: /Continue draft/ }).getAttribute("href"),
  ).toBe("/app/jobs/draft");
  expect(screen.queryByText("Open your first job")).toBeNull();
  expect(
    screen.queryByRole("region", { name: "Application inbox" }),
  ).toBeNull();
});
it("copies the real published job link when waiting for the first application", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  const props = fixture();
  props.work.totalJobs = 1;
  props.work.publishedJobs = 1;
  props.work.shareable = {
    id: "job",
    title: "Designer",
    public_slug: "designer",
  };
  render(<OverviewWork {...props} />);
  expect(screen.getByText("Waiting for applications")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Copy application link" }),
  );
  await screen.findByRole("button", { name: "Link copied" });
  expect(writeText).toHaveBeenCalledWith(
    "https://example.invalid/careers/test/jobs/designer",
  );
});
it("keeps quiet established work distinct from first use", () => {
  const props = fixture();
  props.work.totalJobs = 3;
  props.work.publishedJobs = 2;
  props.overview.counts.applicationsReceived = 10;
  render(<OverviewWork {...props} />);
  expect(screen.getByText("No active jobs")).toBeTruthy();
  expect(screen.getByText("No applications waiting for review")).toBeTruthy();
  expect(screen.queryByText("Waiting for applications")).toBeNull();
  expect(screen.queryByText("Open your first job")).toBeNull();
});
it("uses assignment-aware guidance for recruiters with no visible jobs", () => {
  render(<OverviewWork {...fixture()} role="recruiter" />);
  expect(screen.getByText("No jobs assigned to you")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Start hiring" })).toBeNull();
});
it("shows the real outstanding count rather than the preview length", () => {
  const props = fixture();
  props.overview.counts.applicationsReceived = 12;
  props.overview.counts.applicationsToReview = 8;
  props.overview.applications = [
    {
      id: "app",
      status: "received",
      processing_status: "ready",
      submitted_at: "2026-10-25T10:00:00Z",
      candidates: { full_name: "Synthetic Person" },
      jobs: { id: "job", title: "Designer", clients: { name: "Studio" } },
    },
  ];
  render(<OverviewWork {...props} />);
  const inbox = screen.getByRole("region", { name: "Application inbox" });
  expect(
    within(inbox).getByLabelText("8 applications in the inbox").textContent,
  ).toBe("8");
  expect(
    within(inbox)
      .getByRole("link", { name: /Synthetic Person/ })
      .getAttribute("href"),
  ).toBe("/app/applications/app");
});
it("shows requests only for managers and places real exceptions before normal work", () => {
  const props = fixture();
  props.overview.counts.activeRequests = 1;
  props.overview.requests = [
    {
      id: "request",
      title: "Designer",
      status: "submitted",
      positions_required: 2,
      created_at: "2026-10-25T10:00:00Z",
      clients: { name: "Studio" },
      jobs: [],
    },
  ];
  props.attention = [
    {
      id: "email:message",
      applicationId: "app",
      label: "Email delivery failed",
      detail: "Synthetic message",
      at: "2026-10-25T10:00:00Z",
    },
  ];
  const { rerender } = render(<OverviewWork {...props} />);
  expect(screen.getByRole("region", { name: "Hiring requests" })).toBeTruthy();
  const attention = screen.getByRole("region", { name: "Needs attention" });
  expect(
    attention.compareDocumentPosition(
      screen.getByRole("region", { name: "Start hiring" }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  rerender(<OverviewWork {...props} role="recruiter" />);
  expect(screen.queryByRole("region", { name: "Hiring requests" })).toBeNull();
  expect(screen.getByRole("region", { name: "Needs attention" })).toBeTruthy();
});
