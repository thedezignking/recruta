// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  router.replace.mockClear();
});
describe("account menu", () => {
  it("hides logout until the account row is opened and exposes real destinations", async () => {
    render(
      <AccountMenu
        name="Ada Okafor"
        email="ada@example.com"
        role="owner"
        agencySlug="example-talent"
        workspaceName="Example Talent"
      />,
    );
    expect(screen.queryByText("Log out")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(
      await screen.findByRole("menuitem", { name: "My account" }),
    ).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Example Talent ·", { exact: false })).toBeTruthy();
    expect(
      screen
        .getByRole("menuitem", { name: "Password & security" })
        .getAttribute("href"),
    ).toBe("/app/account#security");
    expect(
      screen.queryByRole("menuitem", { name: "Workspace settings" }),
    ).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Team members" })).toBeNull();
    expect(
      screen
        .getByRole("menuitem", { name: "View careers page" })
        .getAttribute("href"),
    ).toBe("/careers/example-talent");
    expect(
      screen
        .getByRole("menuitem", { name: "Log out" })
        .getAttribute("data-variant"),
    ).toBe("destructive");
  });
  it("opens working keyboard-shortcut help", async () => {
    render(<AccountMenu name="Ada" role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Keyboard shortcuts" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeTruthy();
    expect(screen.getByText("Focus workspace search")).toBeTruthy();
  });
  it("omits administration for recruiters and permits logout retry after failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetch);
    render(<AccountMenu name="Ada" role="recruiter" />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    await screen.findByRole("menuitem", { name: "My account" });
    expect(screen.queryByRole("menuitem", { name: "Team members" })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
