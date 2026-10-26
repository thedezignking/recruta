// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/context", () => ({
  requireAgencyPageContext: vi
    .fn()
    .mockResolvedValue({ supabase: {}, agencyId: "agency" }),
}));
vi.mock("@/server/services/clients", () => ({
  listClients: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import OrganizationsPage from "@/app/(agency)/app/clients/page";

afterEach(cleanup);

it("keeps the header action primary and the repeated empty-state action outline", async () => {
  render(await OrganizationsPage());
  const [headerAction, emptyAction] = screen.getAllByRole("link", {
    name: "Add organization",
  });
  expect(headerAction.className).toContain("bg-primary");
  expect(emptyAction.className).toContain("border-border");
  expect(emptyAction.className).not.toContain("bg-secondary");
  expect(emptyAction.className).not.toContain("bg-primary");
  for (const action of [headerAction, emptyAction]) {
    expect(action.getAttribute("href")).toBe("/app/clients/new");
  }
});
