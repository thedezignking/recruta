import { describe, expect, it } from "vitest";
import { overviewWindow, parseOverviewRange } from "./overview-range";

describe("overview date ranges", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  it.each([undefined, "invalid", ["7d"], "", null])(
    "defaults missing and invalid query values to 30 days: %s",
    (value) => {
      expect(parseOverviewRange(value)).toBe("30d");
    },
  );
  it.each([
    ["24h", "2026-10-24T12:00:00.000Z"],
    ["7d", "2026-10-18T12:00:00.000Z"],
    ["14d", "2026-10-11T12:00:00.000Z"],
    ["30d", "2026-09-25T12:00:00.000Z"],
  ] as const)("uses a rolling UTC window for %s", (range, since) => {
    expect(parseOverviewRange(range)).toBe(range);
    expect(overviewWindow(range, now)).toEqual({
      since,
      until: now.toISOString(),
    });
  });
  it("does not bound all-time counts", () =>
    expect(overviewWindow("all", now)).toBeNull());
});
