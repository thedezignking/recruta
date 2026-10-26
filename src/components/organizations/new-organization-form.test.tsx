// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewOrganizationForm } from "./new-organization-form";
const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockClear();
});
describe("organization creation", () => {
  it("saves a manual organization without forcing a contact or company provider", async () => {
    const fetch = vi.fn().mockImplementation(async (_url, options) =>
      options?.method === "POST"
        ? {
            ok: true,
            json: async () => ({ data: { id: "organization-id" } }),
          }
        : { ok: true, json: async () => ({ data: { items: [] } }) },
    );
    vi.stubGlobal("fetch", fetch);
    render(<NewOrganizationForm agencyId="agency" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Enter details manually" }),
    );
    expect(screen.queryByLabelText(/logo url/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Organization name"), {
      target: { value: "Local Studio" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create organization" }),
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/app/clients/organization-id"),
    );
    const options = fetch.mock.calls.find(
      (call) => call[1]?.method === "POST",
    )?.[1];
    expect(JSON.parse(options.body).primaryContact).toBeUndefined();
    expect(options.headers["x-agency-id"]).toBe("agency");
    expect(options.headers["x-request-id"]).toBeTruthy();
  });
});
