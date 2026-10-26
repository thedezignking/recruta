// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgencySettingsForm } from "@/components/settings/agency-settings-form";
import { InviteMemberForm } from "@/components/team/invite-member-form";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("tenant-wide mutation context", () => {
  it("pins settings to the workspace that rendered the form", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    vi.stubGlobal("fetch", fetch);
    render(
      <AgencySettingsForm
        agency={{
          id: "originating-agency",
          name: "Example Agency",
          contact_email: "example@example.invalid",
          country_code: "NG",
          timezone: "Africa/Lagos",
          primary_specialization: null,
        }}
      />,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Save changes" }).closest("form")!,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][1].headers["x-agency-id"]).toBe(
      "originating-agency",
    );
  });
  it("pins team invitations to the originating workspace rather than another tab's preference", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    vi.stubGlobal("fetch", fetch);
    render(<InviteMemberForm agencyId="originating-agency" />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Send invite" }).closest("form")!,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][1].headers["x-agency-id"]).toBe(
      "originating-agency",
    );
  });
});
