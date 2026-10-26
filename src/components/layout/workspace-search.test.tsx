// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSearch } from "./workspace-search";
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockClear();
});

describe("workspace search", () => {
  it("focuses the inline search with the keyboard and navigates without a modal", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              id: "job",
              group: "Jobs",
              label: "Designer",
              detail: "open",
              href: "/app/jobs/job",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetch);
    render(<WorkspaceSearch agencyId="agency-one" />);
    fireEvent.keyDown(window, { metaKey: true, key: "k" });
    const input = screen.getByRole("combobox", { name: "Search workspace" });
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("⌘ K")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Design" } });
    fireEvent.click(await screen.findByRole("option", { name: /Designer/ }));
    expect(router.push).toHaveBeenCalledWith("/app/jobs/job");
    expect(fetch.mock.calls[0][1].headers["x-agency-id"]).toBe("agency-one");
    await waitFor(() =>
      expect(input.getAttribute("aria-expanded")).toBe("false"),
    );
  });
  it("shows a recoverable error without inventing results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection interrupted.")),
    );
    render(<WorkspaceSearch />);
    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Ada" },
    });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Connection interrupted.",
    );
  });
});
