import { describe, expect, it } from "vitest";
import { matchReason, matchSummarySchema } from "./match-grade";

describe("match grade presentation", () => {
  it("describes required and preferred counts", () => {
    expect(
      matchReason({
        band: "partial",
        required_met: 4,
        required_total: 5,
        preferred_met: 1,
        preferred_total: 2,
      }),
    ).toBe("4 of 5 required met · 1 of 2 preferred");
  });

  it("falls back to preferred counts when a job has no required items", () => {
    expect(
      matchReason({
        band: "strong",
        required_met: 0,
        required_total: 0,
        preferred_met: 2,
        preferred_total: 2,
      }),
    ).toBe("2 of 2 preferred met");
  });

  it("rejects unknown bands from the database", () => {
    expect(
      matchSummarySchema.safeParse({
        band: "excellent",
        required_met: 1,
        required_total: 1,
        preferred_met: 0,
        preferred_total: 0,
      }).success,
    ).toBe(false);
  });
});
