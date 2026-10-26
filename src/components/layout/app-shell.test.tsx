// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

const navigationState = vi.hoisted(() => ({ pathname: "/app/applications" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  navigationState.pathname = "/app/applications";
});

function renderShell(role: "owner" | "recruiter" = "owner") {
  return render(
    <TooltipProvider>
      <AppShell
        workspaceName="Example Talent"
        userName="Alex Morgan"
        userRole={role}
      >
        <h1>Applications</h1>
      </AppShell>
    </TooltipProvider>,
  );
}

describe("workspace navigation", () => {
  it("omits redundant sidebar labels and the account divider while keeping named navigation", () => {
    renderShell();
    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).queryByText("Workspace", { exact: true }),
    ).toBeNull();
    expect(sidebar.querySelector(".border-t")).toBeNull();
    expect(
      within(sidebar).getByRole("navigation", { name: "Agency workspace" }),
    ).toBeTruthy();
    expect(
      within(sidebar).getByRole("navigation", {
        name: "Workspace administration",
      }),
    ).toBeTruthy();
    expect(
      within(sidebar).getByRole("button", { name: "Open account menu" }),
    ).toBeTruthy();
  });
  it("uses a compact abstract fit mark with an accessible wordmark", () => {
    renderShell();
    const logo = within(
      screen.getByRole("link", { name: "Recruta overview" }),
    ).getByRole("img", { name: "Recruta" });
    expect(logo.querySelector("img")?.getAttribute("src")).toBe(
      "/brand/recruta-symbol.svg",
    );
    expect(logo.textContent).toBe("Recruta");
    expect(logo.className).toContain("items-center");
  });
  it("uses solid active icons, calm linear inactive icons and neutral selection surfaces", () => {
    for (const destination of [
      { path: "/app/clients", label: "Organizations", icon: "buildings" },
      {
        path: "/app/requests",
        label: "Hiring requests",
        icon: "clipboard-text",
      },
    ]) {
      navigationState.pathname = destination.path;
      renderShell();
      const navigation = screen.getByRole("navigation", {
        name: "Agency workspace",
      });
      const link = within(navigation).getByRole("link", {
        name: destination.label,
      });
      expect(
        link.querySelector(`.solar-${destination.icon}-bold`),
      ).not.toBeNull();
      expect(link.getAttribute("aria-current")).toBe("page");
      expect(
        link.querySelector("svg")?.classList.contains("text-primary"),
      ).toBe(true);
      expect(link.className).toContain("bg-sidebar-accent");
      expect(link.className).not.toContain("bg-accent ");
      cleanup();
    }
    navigationState.pathname = "/app";
    renderShell();
    const navigation = screen.getByRole("navigation", {
      name: "Agency workspace",
    });
    expect(
      within(navigation)
        .getByRole("link", { name: "Organizations" })
        .querySelector(".solar-buildings-linear"),
    ).not.toBeNull();
    expect(
      within(navigation)
        .getByRole("link", { name: "Hiring requests" })
        .querySelector(".solar-clipboard-text-linear"),
    ).not.toBeNull();
  });
  it("keeps navigation named and the current destination marked when collapsed", () => {
    renderShell();
    const navigation = screen.getByRole("navigation", {
      name: "Agency workspace",
    });
    expect(
      within(navigation)
        .getByRole("link", { name: "Applications" })
        .getAttribute("aria-current"),
    ).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Expand sidebar" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      within(navigation)
        .getByRole("link", { name: "Jobs" })
        .getAttribute("href"),
    ).toBe("/app/jobs");
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(
      screen
        .getByRole("button", { name: "Collapse sidebar" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("does not show agency administration to a recruiter", () => {
    renderShell("recruiter");
    expect(
      screen.queryByRole("navigation", { name: "Workspace administration" }),
    ).toBeNull();
    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("link", { name: "New job" })).toBeNull();
    expect(within(header).queryByText("Workspace")).toBeNull();
  });

  it("makes hiring requests and administration reachable through the mobile menu", async () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      await screen.findByRole("menuitem", { name: "Hiring requests" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Team" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
  });
});
