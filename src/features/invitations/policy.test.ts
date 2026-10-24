import { describe, expect, it } from "vitest";
import {
  INVITATION_LIFETIME_MS,
  invitationExpiresAt,
  invitationIsAcceptable,
} from "./policy";

describe("invitation policy", () => {
  const now = new Date("2026-10-23T12:00:00.000Z");

  it("expires invitations after 72 hours", () => {
    expect(invitationExpiresAt(now).getTime() - now.getTime()).toBe(
      INVITATION_LIFETIME_MS,
    );
  });

  it("rejects expired, accepted, and revoked invitations", () => {
    expect(
      invitationIsAcceptable({
        expiresAt: new Date(now.getTime() + 1),
        now,
      }),
    ).toBe(true);
    expect(invitationIsAcceptable({ expiresAt: now, now })).toBe(false);
    expect(
      invitationIsAcceptable({
        expiresAt: new Date(now.getTime() + 1),
        acceptedAt: now,
        now,
      }),
    ).toBe(false);
    expect(
      invitationIsAcceptable({
        expiresAt: new Date(now.getTime() + 1),
        revokedAt: now,
        now,
      }),
    ).toBe(false);
  });
});
