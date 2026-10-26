import { describe, expect, it } from "vitest";
import {
  attachmentUploadSchema,
  hiringRequestSchema,
  manualJobSchema,
  publicApplicationSchema,
} from "./validation";

const baseRequest = {
  clientId: "dd72862a-5791-4f70-882e-e391ff94f21f",
  title: "Senior Engineer",
  description: "A detailed brief that is long enough to validate.",
  positionsRequired: 2,
  workArrangement: "hybrid",
  requirements: [],
};

describe("hiring request validation", () => {
  it("accepts a valid request", () =>
    expect(hiringRequestSchema.safeParse(baseRequest).success).toBe(true));
  it("rejects an inverted salary range", () =>
    expect(
      hiringRequestSchema.safeParse({
        ...baseRequest,
        salaryMin: 400,
        salaryMax: 300,
      }).success,
    ).toBe(false));
});

describe("attachment validation", () => {
  it("accepts PDF and DOCX files up to 10 MiB", () => {
    expect(
      attachmentUploadSchema.safeParse({
        fileName: "brief.pdf",
        contentType: "application/pdf",
        sizeBytes: 10 * 1024 * 1024,
      }).success,
    ).toBe(true);
    expect(
      attachmentUploadSchema.safeParse({
        fileName: "brief.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported or oversized files", () => {
    expect(
      attachmentUploadSchema.safeParse({
        fileName: "brief.png",
        contentType: "image/png",
        sizeBytes: 1024,
      }).success,
    ).toBe(false);
    expect(
      attachmentUploadSchema.safeParse({
        fileName: "brief.pdf",
        contentType: "application/pdf",
        sizeBytes: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });
});

describe("manual job validation", () => {
  const job = {
    clientId: "dd72862a-5791-4f70-882e-e391ff94f21f",
    title: "Product designer",
    description: "A candidate-facing description with enough useful detail.",
    positionsRequired: 1,
    workArrangement: "hybrid",
    requirements: [],
    questions: [],
    publish: true,
  };

  it("accepts an existing organization", () => {
    expect(manualJobSchema.safeParse(job).success).toBe(true);
  });
  it("allows an empty optional application deadline", () => {
    const result = manualJobSchema.safeParse({ ...job, deadlineAt: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.deadlineAt).toBeUndefined();
  });

  it("accepts inline organization creation", () => {
    expect(
      manualJobSchema.safeParse({
        ...job,
        clientId: null,
        newOrganization: { name: "Northstar Health" },
      }).success,
    ).toBe(true);
  });

  it("requires an organization", () => {
    expect(manualJobSchema.safeParse({ ...job, clientId: null }).success).toBe(
      false,
    );
  });
});

describe("public application validation", () => {
  it("requires explicit consent", () => {
    expect(
      publicApplicationSchema.safeParse({
        fullName: "Ada Okafor",
        email: "ada@example.com",
        consent: "false",
        answers: [],
      }).success,
    ).toBe(false);
  });
});
