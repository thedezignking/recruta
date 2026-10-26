import { describe, expect, it } from "vitest";
import {
  candidateMessageSchema,
  processingSettingsSchema,
  screeningCorrectionSchema,
  defaultProcessingSettings,
} from "./applicant-processing";
describe("applicant processing contracts", () => {
  it("starts with manual AI and automatic AI disabled", () => {
    expect(defaultProcessingSettings.screeningEnabled).toBe(false);
    expect(defaultProcessingSettings.automaticScreening).toBe(false);
  });
  it("does not allow automatic screening without workspace screening", () => {
    expect(
      processingSettingsSchema.safeParse({
        ...defaultProcessingSettings,
        automaticScreening: true,
      }).success,
    ).toBe(false);
  });
  it("rejects header injection and unconfirmed rejection messages", () => {
    expect(
      candidateMessageSchema.safeParse({
        kind: "custom",
        subject: "Hello\r\nBcc: stranger@example.invalid",
        body: "Hello",
      }).success,
    ).toBe(false);
    expect(
      candidateMessageSchema.safeParse({
        kind: "rejection",
        subject: "Decision",
        body: "Reviewed",
        confirmed: false,
      }).success,
    ).toBe(false);
  });
  it("requires a reason and binds corrections to a specific run/requirement", () => {
    expect(
      screeningCorrectionSchema.safeParse({
        id: crypto.randomUUID(),
        runId: crypto.randomUUID(),
        requirementId: crypto.randomUUID(),
        verdict: "supported",
        explanation: "Checked the source evidence.",
      }).success,
    ).toBe(true);
    expect(
      screeningCorrectionSchema.safeParse({ explanation: "yes" }).success,
    ).toBe(false);
  });
});
