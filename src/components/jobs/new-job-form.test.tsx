// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "@base-ui/react/dialog";
import { NewJobForm } from "./new-job-form";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockClear();
});
describe("job organization selection", () => {
  it("keeps the recruiter on essentials when required fields are missing", async () => {
    render(
      <Dialog.Root open>
        <NewJobForm
          agencyId="agency"
          clients={[]}
          currentUserId="87e74942-d83d-4c8c-aa2c-1cdfe3fa56bd"
          workflows={[]}
          recruiters={[]}
        />
      </Dialog.Root>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(
        screen.getByText("Choose an organization or create one here."),
      ).toBeTruthy(),
    );
    expect(screen.getByLabelText("Job title")).toBeTruthy();
    expect(screen.queryByLabelText("Department")).toBeNull();
  });

  it("saves a job for a chosen organization without validating hidden blank company fields", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "job-id" } }),
    });
    vi.stubGlobal("fetch", fetch);
    const organizationId = "dd72862a-5791-4f70-882e-e391ff94f21f";
    render(
      <Dialog.Root open>
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
        />
      </Dialog.Root>,
    );
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Designer" },
    });
    expect(screen.queryByLabelText("Candidate note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Job description")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "A detailed role for our growing design team." },
    });
    expect(screen.queryByText("Requirements")).toBeNull();
    expect(screen.queryByText("Public job and application preview")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/app/jobs/job-id"),
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.clientId).toBe(organizationId);
    expect(body.newOrganization).toBeUndefined();
    expect(body.applicationFormIntro).toBeUndefined();
  });

  it("reveals optional details and the public preview in order", async () => {
    const organizationId = "dd72862a-5791-4f70-882e-e391ff94f21f";
    render(
      <Dialog.Root open>
        <NewJobForm
          agencyId="agency"
          clients={[{ id: organizationId, name: "Saved Studio" }]}
          initialClientId={organizationId}
          currentUserId="87e74942-d83d-4c8c-aa2c-1cdfe3fa56bd"
          workflows={[]}
          recruiters={[]}
        />
      </Dialog.Root>,
    );
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Designer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Job description")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "A detailed role for our growing design team." },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "Design" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Job title")).toHaveProperty(
      "value",
      "Designer",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Department")).toHaveProperty(
        "value",
        "Design",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByText("Requirements")).toBeTruthy());
    expect(screen.queryByText("Public job and application preview")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review job" }));
    await waitFor(() =>
      expect(
        screen.getByText("Public job and application preview"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: "Create and publish" }),
    ).toBeTruthy();
  });
});
