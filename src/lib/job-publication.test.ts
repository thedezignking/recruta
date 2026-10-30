import { describe, expect, it } from "vitest";
import { isAcceptingPublicApplications } from "./job-publication";

const published = {
  status: "open",
  public_slug: "designer-abc123",
  published_at: "2026-10-28T10:00:00Z",
  accepting_applications: true,
};

describe("public application link state", () => {
  it("does not expose a draft link even when a slug was generated", () => {
    expect(
      isAcceptingPublicApplications({
        ...published,
        status: "draft",
        published_at: null,
        accepting_applications: false,
      }),
    ).toBe(false);
  });

  it("requires an open, published, accepting job", () => {
    expect(isAcceptingPublicApplications(published)).toBe(true);
    expect(
      isAcceptingPublicApplications({ ...published, status: "on_hold" }),
    ).toBe(false);
    expect(
      isAcceptingPublicApplications({
        ...published,
        accepting_applications: false,
      }),
    ).toBe(false);
    expect(
      isAcceptingPublicApplications({ ...published, published_at: null }),
    ).toBe(false);
  });
});
