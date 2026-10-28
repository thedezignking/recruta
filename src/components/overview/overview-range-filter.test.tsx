// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverviewRangeFilter } from "./overview-range-filter";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), query: "keep=yes" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
afterEach(() => {
  cleanup();
  navigation.replace.mockClear();
  navigation.query = "keep=yes";
});
describe("summary range filter", () => {
  it("selects a real URL range and preserves other parameters", () => {
    render(<OverviewRangeFilter value="all" />);
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    expect(navigation.replace).toHaveBeenCalledWith("/app?keep=yes&range=7d", {
      scroll: false,
    });
  });
  it("keeps All time explicit because the default is 30 days", () => {
    navigation.query = "range=7d";
    render(<OverviewRangeFilter value="7d" />);
    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    expect(navigation.replace).toHaveBeenCalledWith("/app?range=all", {
      scroll: false,
    });
  });
  it("removes the query for the default Last 30 days", () => {
    navigation.query = "range=7d";
    render(<OverviewRangeFilter value="7d" />);
    fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(navigation.replace).toHaveBeenCalledWith("/app", { scroll: false });
  });
});
