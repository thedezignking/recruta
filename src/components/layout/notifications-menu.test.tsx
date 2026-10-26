// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationsMenu } from "./notifications-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
function mount() {
  render(
    <TooltipProvider>
      <NotificationsMenu agencyId="agency" userId="user" />
    </TooltipProvider>,
  );
}
describe("notification panel", () => {
  it("shows actual updates, follows their destinations, and persists read IDs without content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            items: [
              {
                id: "application:one",
                kind: "application",
                title: "New application",
                detail: "Ada · Designer",
                href: "/app/applications?candidateId=one",
                occurredAt: "2026-10-24T10:00:00Z",
              },
            ],
          },
        }),
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications, 1 unread" }),
    );
    expect(
      await screen.findByRole("link", { name: /New application/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mark all as read" }),
      ).toBeNull(),
    );
    const saved = localStorage.getItem(
      "recruta.notifications.read:agency:user",
    );
    expect(saved).toBe('["application:one"]');
    expect(saved).not.toContain("Ada");
  });
  it("has an honest empty state and no artificial unread dot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { items: [] } }),
      }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You’re all caught up")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /unread/ })).toBeNull();
  });
  it("shows failures with a retry instead of an empty success state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection interrupted.")),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText("You’re all caught up")).toBeNull();
  });
});
