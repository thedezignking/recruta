import { describe, it, expect } from "vitest";
import {
  collaboratorSchema,
  feedbackSchema,
  jobInvitationSchema,
  shareCandidateSchema,
} from "./collaboration";
describe("collaboration contracts", () => {
  it("binds withdrawal to the submission being withdrawn", () => {
    expect(shareCandidateSchema.safeParse({ action: "withdraw" }).success).toBe(
      false,
    );
    expect(
      shareCandidateSchema.parse({
        action: "withdraw",
        submissionId: crypto.randomUUID(),
      }).action,
    ).toBe("withdraw");
  });
  it("requires an intentional summary and explicit document ID", () => {
    expect(
      shareCandidateSchema.safeParse({ action: "share", summary: "AI score" })
        .success,
    ).toBe(false);
    const p = shareCandidateSchema.parse({
      action: "share",
      summary: "A recruiter-written submission.",
    });
    expect(p.action === "share" ? p.documentId : undefined).toBeNull();
  });
  it("rejects arbitrary feedback decisions and insufficient comments", () => {
    expect(
      feedbackSchema.safeParse({
        feedbackId: crypto.randomUUID(),
        recommendation: "hire",
        comment: "Hire this person",
      }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({
        feedbackId: crypto.randomUUID(),
        recommendation: "proceed",
        comment: "ok",
      }).success,
    ).toBe(false);
  });
  it("does not allow a job invitation to mint an organization administrator", () => {
    expect(
      jobInvitationSchema.safeParse({
        email: "test@example.invalid",
        role: "client_administrator",
      }).success,
    ).toBe(false);
  });
  it("accepts only grant/revoke with valid teammate IDs", () => {
    expect(
      collaboratorSchema.safeParse({ userId: "forged", action: "grant" })
        .success,
    ).toBe(false);
  });
});
