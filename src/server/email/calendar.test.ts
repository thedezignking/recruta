import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { interviewInvite } = await import("./calendar");

const base = {
  interviewId: "11111111-1111-4111-8111-111111111111",
  updatedAt: "2026-11-02T08:00:00Z",
  startsAt: "2026-11-10T09:00:00Z",
  endsAt: "2026-11-10T09:45:00Z",
  title: "First interview: Analyst with Evenkore",
  description: "First interview, for the Analyst role; bring ID",
  location: "https://meet.example.invalid/abc",
  organizerName: "Evenkore",
  organizerEmail: "hiring@example.invalid",
  attendeeEmail: "candidate@example.invalid",
};

describe("interviewInvite", () => {
  it("builds a request with a stable UID and UTC times", () => {
    const { method, content } = interviewInvite(base);
    expect(method).toBe("REQUEST");
    expect(content).toContain(`UID:${base.interviewId}@recruta`);
    expect(content).toContain("DTSTART:20261110T090000Z");
    expect(content).toContain("DTEND:20261110T094500Z");
    expect(content).toContain(
      String.raw`DESCRIPTION:First interview\, for the Analyst role\; bring ID`,
    );
    expect(content).toContain("\r\n");
  });

  it("cancels the same event with a higher sequence", () => {
    const first = interviewInvite(base).content.match(/SEQUENCE:(\d+)/)![1];
    const cancelled = interviewInvite({
      ...base,
      updatedAt: "2026-11-03T08:00:00Z",
      cancelled: true,
    });
    expect(cancelled.method).toBe("CANCEL");
    expect(cancelled.content).toContain("STATUS:CANCELLED");
    expect(cancelled.content).toContain(`UID:${base.interviewId}@recruta`);
    expect(
      Number(cancelled.content.match(/SEQUENCE:(\d+)/)![1]),
    ).toBeGreaterThan(Number(first));
  });

  it("folds long lines to 75 octets", () => {
    const { content } = interviewInvite({
      ...base,
      description: "x".repeat(300),
    });
    for (const line of content.split("\r\n"))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
