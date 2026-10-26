import { describe, expect, it } from "vitest";
import {
  applicationActionSchema,
  applicationCursorSchema,
  applicationFiltersSchema,
  applicationStatuses,
  applicationTransitions,
  transitionNeedsReason,
} from "./applicant-operations";

describe("applicant review rules", () => {
  it("defines transitions for every stage without permitting fabricated placements", () => {
    expect(Object.keys(applicationTransitions)).toEqual([
      ...applicationStatuses,
    ]);
    expect(applicationTransitions.received).not.toContain("shortlisted");
    expect(Object.values(applicationTransitions).flat()).not.toContain(
      "placed",
    );
    expect(applicationTransitions.placed).toEqual([]);
  });
  it("requires reasons for rejection, withdrawal, and reopening", () => {
    expect(transitionNeedsReason("in_review", "rejected")).toBe(true);
    expect(transitionNeedsReason("rejected", "in_review")).toBe(true);
    expect(transitionNeedsReason("withdrawn", "in_review")).toBe(true);
    expect(transitionNeedsReason("in_review", "shortlisted")).toBe(false);
  });
  it("validates filters and normalizes blank values", () => {
    expect(
      applicationFiltersSchema.parse({ q: " Ada ", status: "", jobId: null }),
    ).toEqual({ q: "Ada", status: undefined, jobId: undefined });
    expect(
      applicationFiltersSchema.safeParse({ status: "hired" }).success,
    ).toBe(false);
    expect(
      applicationFiltersSchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      applicationFiltersSchema.safeParse({ jobId: "invalid" }).success,
    ).toBe(false);
    expect(
      applicationFiltersSchema.safeParse({ cursor: "unsafe,(filter)" }).success,
    ).toBe(false);
  });
  it("requires both cursor timestamp and UUID tie-breaker", () => {
    expect(
      applicationCursorSchema.safeParse({ at: "2026-10-24T10:00:00Z" }).success,
    ).toBe(false);
    expect(
      applicationCursorSchema.safeParse({ at: "bad", id: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });
  it("requires concurrency tokens on state changes and retry-safe note IDs", () => {
    expect(
      applicationActionSchema.safeParse({
        action: "transition",
        status: "in_review",
      }).success,
    ).toBe(false);
    expect(
      applicationActionSchema.safeParse({ action: "assign", ownerUserId: null })
        .success,
    ).toBe(false);
    expect(
      applicationActionSchema.safeParse({
        action: "note",
        noteId: crypto.randomUUID(),
        body: "   ",
      }).success,
    ).toBe(false);
    expect(
      applicationActionSchema.parse({
        action: "note",
        noteId: crypto.randomUUID(),
        body: " Evidence ",
      }),
    ).toMatchObject({ action: "note", body: "Evidence" });
  });
});
