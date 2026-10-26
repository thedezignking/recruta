// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AgencyLogo } from "./agency-logo";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("pins removal to the workspace and expected current logo", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { path: null, url: null } }),
  });
  vi.stubGlobal("fetch", fetch);
  render(
    <AgencyLogo
      agencyId="agency-a"
      initialPath="agency-a/old.png"
      initialUrl="https://example.invalid/logo.png"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/agency/logo",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          "x-agency-id": "agency-a",
          "content-type": "application/json",
        },
        body: JSON.stringify({ expectedPath: "agency-a/old.png" }),
      }),
    ),
  );
  await screen.findByText("Logo removed.");
  expect(screen.queryByRole("img", { name: "Agency logo" })).toBeNull();
});
it("rejects an unsupported file before sending anything", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(
    <AgencyLogo agencyId="agency-a" initialPath={null} initialUrl={null} />,
  );
  fireEvent.change(screen.getByLabelText("Upload agency logo"), {
    target: {
      files: [new File(["svg"], "logo.svg", { type: "image/svg+xml" })],
    },
  });
  expect(screen.getByRole("alert").textContent).toContain("PNG, JPG or WebP");
  expect(fetch).not.toHaveBeenCalled();
});
