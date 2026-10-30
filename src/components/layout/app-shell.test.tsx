// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { workspaceLogoSrc } from "./workspace-switcher";
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

function renderShell(
  role: "owner" | "recruiter" = "owner",
  agencySlug?: string,
) {
  return render(
    <TooltipProvider>
      <AppShell
        workspaceName="Example Talent"
        userName="Alex Morgan"
        userRole={role}
        agencySlug={agencySlug}
      >
        <h1>Applications</h1>
      </AppShell>
    </TooltipProvider>,
  );
}

describe("workspace navigation", () => {
  it("keeps compact navigation and anchors the account in the sidebar", () => {
    renderShell();
    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).queryByText("Workspace", { exact: true }),
    ).toBeNull();
    expect(
      within(sidebar).getByRole("navigation", { name: "Agency workspace" }),
    ).toBeTruthy();
    expect(within(sidebar).queryByText("Main menu")).toBeNull();
    const management = within(sidebar).getByRole("navigation", {
      name: "Workspace management",
    });
    expect(within(management).getByRole("link", { name: "Team" })).toBeTruthy();
    expect(
      within(management).getByRole("link", { name: "Settings" }),
    ).toBeTruthy();
    expect(
      within(sidebar).getByRole("button", {
        name: "Open account menu",
      }),
    ).toBeTruthy();
  });
  it("closes the account menu when the workspace switcher opens", async () => {
    renderShell();
    const sidebar = screen.getByRole("complementary");
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "Open account menu" }),
    );
    expect(
      await screen.findByRole("menu", { name: "Open account menu" }),
    ).toBeTruthy();
    fireEvent.click(
      within(sidebar).getByRole("button", { name: "Switch workspace" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("menu", { name: "Open account menu" }),
      ).toBeNull(),
    );
    expect(screen.getByRole("menu", { name: "Switch workspace" })).toBeTruthy();
  });
  it("uses an agency initial when no logo is assigned", () => {
    renderShell();
    const switcher = within(screen.getByRole("complementary")).getByRole(
      "button",
      { name: "Switch workspace" },
    );
    expect(switcher.querySelector("img")).toBeNull();
    expect(switcher.textContent).toContain("E");
    expect(switcher.textContent).toContain("Example Talent");
  });
  it("uses Evenkore's assigned local logo", () => {
    expect(workspaceLogoSrc(null, "evenkore")).toBe(
      "/brand/evenkore-symbol.svg",
    );
    expect(workspaceLogoSrc(null, "other-agency")).toBeNull();
    expect(workspaceLogoSrc("/uploaded-logo.webp", "evenkore")).toBe(
      "/uploaded-logo.webp",
    );
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
        link.querySelector("svg")?.classList.contains("text-foreground"),
      ).toBe(true);
      expect(link.className).toContain("bg-card");
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
    const navigation = screen.getByRole("navigation", {
      name: "Agency workspace",
    });
    expect(within(navigation).queryByRole("link", { name: "Team" })).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Workspace management" }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("link", { name: "Settings" }),
    ).toBeNull();
    const header = screen.getByRole("banner");
    expect(within(header).queryByText("Workspace")).toBeNull();
    expect(
      within(header).getByRole("combobox", { name: "Search workspace" }),
    ).toBeTruthy();
    expect(
      within(header).getByRole("button", { name: "Notifications" }),
    ).toBeTruthy();
    expect(
      within(header)
        .getByRole("button", { name: "Notifications" })
        .compareDocumentPosition(
          within(header).getByRole("combobox", { name: "Search workspace" }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps Overview's toolbar to search and notifications without New job", () => {
    navigationState.pathname = "/app";
    renderShell();
    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("heading", { name: "Overview" }),
    ).toBeTruthy();
    expect(within(header).queryByRole("link", { name: "New job" })).toBeNull();
    expect(
      within(header).getByRole("combobox", { name: "Search workspace" }),
    ).toBeTruthy();
    expect(
      within(header).getByRole("button", { name: "Notifications" }),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("complementary")).getByRole("button", {
        name: "Open account menu",
      }),
    ).toBeTruthy();
  });

  it("puts the New job action in the Jobs toolbar after notifications", () => {
    navigationState.pathname = "/app/jobs";
    renderShell();
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "New job" })).toBeTruthy();
    expect(
      within(header)
        .getByRole("button", { name: "Notifications" })
        .compareDocumentPosition(
          within(header).getByRole("link", { name: "New job" }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps hiring requests in the mobile navigation", async () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      await screen.findByRole("menuitem", { name: "Hiring requests" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Team" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
  });
});
