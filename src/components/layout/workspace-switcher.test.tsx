// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "./workspace-switcher";
const workspaces = [
  { id: "a", name: "Example Talent", role: "owner" },
  { id: "b", name: "Other Agency", role: "recruiter" },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("workspace selector", () => {
  it("lists real memberships, marks the current workspace and links to creation", async () => {
    render(
      <WorkspaceSwitcher
        currentId="a"
        name="Example Talent"
        workspaces={workspaces}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch workspace" }));
    expect(
      await screen.findByRole("menuitem", {
        name: "Example Talent, current workspace",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Other Agency" })).toBeTruthy();
    expect(
      screen
        .getByRole("menuitem", { name: "Create workspace" })
        .getAttribute("href"),
    ).toBe("/app/workspaces/new");
  });
  it("does not reselect the current membership and reports failures without losing the menu", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    render(
      <WorkspaceSwitcher
        currentId="a"
        name="Example Talent"
        workspaces={workspaces}
        compact
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch workspace" }));
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Example Talent, current workspace",
      }),
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Other Agency" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not switch",
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/workspaces/select",
      expect.objectContaining({ body: JSON.stringify({ agencyId: "b" }) }),
    );
  });
});
