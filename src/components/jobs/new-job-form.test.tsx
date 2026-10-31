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
import { manualJobSchema } from "@/lib/validation";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./job-description-editor", () => ({
  JobDescriptionEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <>
      <div role="toolbar" aria-label="Job description formatting" />
      <textarea
        aria-label="Job description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockClear();
});
describe("job organization selection", () => {
  it("requires recruiters to replace description outline prompts", () => {
    const base = {
      clientId: "dd72862a-5791-4f70-882e-e391ff94f21f",
      title: "Software Engineer",
      description: "About the role\n[Describe the work this person will own.]",
      positionsRequired: 1,
      workArrangement: "remote" as const,
      employmentArrangement: "permanent",
      remoteEligibility: "anywhere",
    };
    expect(manualJobSchema.safeParse(base).success).toBe(false);
    expect(
      manualJobSchema.safeParse({
        ...base,
        description: "Build and maintain our candidate experience.",
        salaryMin: "",
        salaryMax: "",
      }).success,
    ).toBe(true);
  });

  it("accepts a selected salary pay period and rejects unsupported values", () => {
    const job = {
      clientId: "dd72862a-5791-4f70-882e-e391ff94f21f",
      title: "Software Engineer",
      description: "Build and maintain the candidate experience.",
      positionsRequired: 1,
      workArrangement: "remote" as const,
      employmentArrangement: "permanent",
      remoteEligibility: "anywhere",
      salaryMin: 5000,
      salaryMax: 7000,
      currency: "NGN",
      salaryPeriod: "monthly",
    };
    expect(manualJobSchema.safeParse(job).success).toBe(true);
    expect(
      manualJobSchema.safeParse({ ...job, salaryPeriod: "fortnightly" })
        .success,
    ).toBe(false);
  });

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
    expect(screen.queryByText("Start with an outline")).toBeNull();
    expect(screen.queryByLabelText("Department")).toBeNull();
    expect(
      screen.getByRole("toolbar", { name: "Job description formatting" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "A detailed role for our growing design team." },
    });
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Workplace type" }),
      { key: "ArrowDown" },
    );
    fireEvent.keyDown(await screen.findByRole("option", { name: "Remote" }), {
      key: "Enter",
    });
    expect(
      screen.getByRole("combobox", { name: "Workplace type" }).textContent,
    ).toContain("Remote");
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
          workflows={[
            {
              id: "dd72862a-5791-4f70-882e-e391ff94f21f",
              name: "Standard",
              stages: [{ name: "Received" }],
            },
          ]}
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
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Job description")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "A detailed role for our growing design team." },
    });
    expect(screen.queryByLabelText("Department")).toBeNull();
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Workplace type" }),
      { key: "ArrowDown" },
    );
    fireEvent.keyDown(await screen.findByRole("option", { name: "Remote" }), {
      key: "Enter",
    });
    expect(
      screen.getByRole("combobox", { name: "Workplace type" }).textContent,
    ).toContain("Remote");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    // The role fields survive returning to Essentials.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Employment type" }),
      ).toBeTruthy(),
    );
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Employment type" }),
      { key: "ArrowDown" },
    );
    fireEvent.keyDown(
      await screen.findByRole("option", { name: "Full-time" }),
      {
        key: "Enter",
      },
    );
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Remote eligibility" }),
      { key: "ArrowDown" },
    );
    fireEvent.keyDown(
      await screen.findByRole("option", { name: "Work from anywhere" }),
      { key: "Enter" },
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Job title")).toHaveProperty(
      "value",
      "Designer",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Job description")).toHaveProperty(
        "value",
        "A detailed role for our growing design team.",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByText("Structured criteria")).toBeTruthy(),
    );
    expect(screen.queryByText("Public job and application preview")).toBeNull();
    screen.getByRole("region", { name: "Job form content" }).scrollTop = 800;
    fireEvent.click(screen.getByRole("button", { name: "Review job" }));
    await waitFor(() =>
      expect(
        screen.getByText("Public job and application preview"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByRole("region", { name: "Job form content" }).scrollTop,
    ).toBe(0);
    expect(
      screen.getByRole("button", { name: "Create and publish" }),
    ).toBeTruthy();
  }, 15000);
});
