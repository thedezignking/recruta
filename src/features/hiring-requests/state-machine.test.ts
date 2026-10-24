import { describe, expect, it } from "vitest";
import {
  allowedHiringRequestActions,
  transitionHiringRequest,
} from "./state-machine";

describe("hiring request state machine", () => {
  it("supports the clarification and resubmission cycle", () => {
    expect(
      transitionHiringRequest("under_review", "request_clarification"),
    ).toBe("clarification_requested");
    expect(transitionHiringRequest("clarification_requested", "resubmit")).toBe(
      "submitted",
    );
  });

  it("makes approved requests terminal", () => {
    expect(allowedHiringRequestActions("approved")).toEqual([]);
    expect(() => transitionHiringRequest("approved", "cancel")).toThrow(
      /Cannot cancel/,
    );
  });
});
