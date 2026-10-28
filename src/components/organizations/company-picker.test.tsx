// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyPicker } from "./company-picker";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("company picker", () => {
  it("shows live suggestions with a client ID alone, including brands without icons", async () => {
    const fetch = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.startsWith("https://api.brandfetch.io/")
          ? [
              { name: "Example brand", domain: "example.com", icon: null },
              { name: null, domain: "other.example", icon: null },
            ]
          : { data: { items: [] } },
    }));
    vi.stubGlobal("fetch", fetch);
    render(
      <CompanyPicker
        agencyId="agency"
        lookupClientId="public-client-id"
        onSelect={vi.fn()}
        onManual={vi.fn()}
      />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Example" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(
      await screen.findByRole("option", { name: /Example brand/ }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("option", { name: /other.example/ }),
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.brandfetch.io/v2/search/Example?c=public-client-id",
      expect.objectContaining({ credentials: "omit", cache: "no-store" }),
    );
  });
  it("keeps manual entry immediately available without creating anything", () => {
    const fetch = vi.fn();
    const manual = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <CompanyPicker agencyId="agency" onSelect={vi.fn()} onManual={manual} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enter details manually" }),
    );
    expect(manual).toHaveBeenCalledWith("");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("searches beyond initial options and selects an existing organization without a write", async () => {
    const select = vi.fn();
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              id: "saved-id",
              name: "Example Studio",
              website: null,
              industry: null,
              location: null,
              company_profile: {},
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetch);
    render(
      <CompanyPicker agencyId="agency" onSelect={select} onManual={vi.fn()} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Example" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const option = await screen.findByRole("option", {
      name: /Example Studio/,
    });
    fireEvent.click(option);
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Example Studio" }),
      "saved-id",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers["x-agency-id"]).toBe("agency");
  });
  it("preserves manual entry when saved search fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const manual = vi.fn();
    render(
      <CompanyPicker agencyId="agency" onSelect={vi.fn()} onManual={manual} />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Local Studio" },
    });
    expect(
      await screen.findByText(/Saved organizations could not be searched/),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Enter details manually" }),
    );
    expect(manual).toHaveBeenCalledWith("Local Studio");
  });
});
