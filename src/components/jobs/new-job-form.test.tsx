// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewJobForm } from "./new-job-form";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockClear();
});
describe("job organization selection", () => {
  it("saves a job for a chosen organization without validating hidden blank company fields", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "job-id" } }),
    });
    vi.stubGlobal("fetch", fetch);
    const organizationId = "dd72862a-5791-4f70-882e-e391ff94f21f";
    render(
      <NewJobForm
        agencyId="agency"
        clients={[{ id: organizationId, name: "Saved Studio" }]}
        initialClientId={organizationId}
        currentUserId="87e74942-d83d-4c8c-aa2c-1cdfe3fa56bd"
        workflows={[]}
        recruiters={[
          {
            userId: "87e74942-d83d-4c8c-aa2c-1cdfe3fa56bd",
            name: "Test recruiter",
            role: "owner",
          },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Designer" },
    });
    expect(screen.queryByLabelText("Candidate note")).toBeNull();
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "A detailed role for our growing design team." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/app/jobs/job-id"),
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.clientId).toBe(organizationId);
    expect(body.newOrganization).toBeUndefined();
    expect(body.applicationFormIntro).toBeUndefined();
  });
});
