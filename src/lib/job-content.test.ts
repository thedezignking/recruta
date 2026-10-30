import { describe, it, expect } from "vitest";
import { jobDraftSchema, manualJobSchema } from "./validation";
import { legacyEmployment, screeningQuestionSchema } from "./job-content";
const base = {
  clientId: "dd72862a-5791-4f70-882e-e391ff94f21f",
  title: "Support specialist",
  description: "Support our customers and improve the service experience.",
  positionsRequired: 2,
  employmentArrangement: "permanent",
  workArrangement: "on_site",
  location: "Lagos",
};
describe("job content and publication", () => {
  it("retains minimal drafts while requiring the new publication information", () => {
    const draft = {
      clientId: base.clientId,
      title: base.title,
      positionsRequired: 2,
    };
    expect(jobDraftSchema.safeParse(draft).success).toBe(true);
    expect(manualJobSchema.safeParse(draft).success).toBe(false);
  });
  it("requires a location for both physical workplace types", () => {
    for (const workArrangement of ["hybrid", "on_site"]) {
      expect(
        manualJobSchema.safeParse({ ...base, workArrangement, location: "" })
          .success,
      ).toBe(false);
      expect(
        manualJobSchema.safeParse({ ...base, workArrangement }).success,
      ).toBe(true);
    }
  });
  it("requires explicit remote eligibility and details for restricted locations", () => {
    const remote = { ...base, workArrangement: "remote", location: "" };
    expect(manualJobSchema.safeParse(remote).success).toBe(false);
    expect(
      manualJobSchema.safeParse({ ...remote, remoteEligibility: "restricted" })
        .success,
    ).toBe(false);
    expect(
      manualJobSchema.safeParse({
        ...remote,
        remoteEligibility: "restricted",
        remoteDetails: "Nigeria; WAT working hours",
      }).success,
    ).toBe(true);
    expect(
      manualJobSchema.safeParse({ ...remote, remoteEligibility: "anywhere" })
        .success,
    ).toBe(true);
  });
  it("requires duration only for fixed-term and temporary roles", () => {
    for (const employmentArrangement of ["fixed_term", "temporary"]) {
      expect(
        manualJobSchema.safeParse({ ...base, employmentArrangement }).success,
      ).toBe(false);
      expect(
        manualJobSchema.safeParse({
          ...base,
          employmentArrangement,
          contractDuration: "Six months",
        }).success,
      ).toBe(true);
    }
    expect(manualJobSchema.safeParse(base).success).toBe(true);
  });
  it("does not infer permanent employment from legacy hours", () => {
    expect(legacyEmployment("Full-time")).toEqual({
      workingHours: "full_time",
      employmentArrangement: "",
    });
    expect(legacyEmployment("Part-time").employmentArrangement).toBe("");
    expect(legacyEmployment("Contract").employmentArrangement).toBe(
      "fixed_term",
    );
  });
  it("validates start dates and retains optional internal information", () => {
    expect(
      jobDraftSchema.safeParse({ ...base, targetStartDate: "2027-02-30" })
        .success,
    ).toBe(false);
    expect(
      jobDraftSchema.safeParse({
        ...base,
        targetStartDate: "2027-02-28",
        hiringReason: "replacement",
        sourcingBrief: "Private recruiter guidance",
        salaryVisibility: "hidden",
        salaryBasis: "net",
      }).success,
    ).toBe(true);
  });
  it("rejects duplicate, blank and impossible single choices", () => {
    for (const options of [[], ["One"], ["Yes", " yes "], ["One", ""]])
      expect(
        screeningQuestionSchema.safeParse({
          label: "Available shift?",
          questionType: "single_select",
          options,
        }).success,
      ).toBe(false);
    expect(
      screeningQuestionSchema.safeParse({
        label: "Available shift?",
        questionType: "single_select",
        options: ["Day, including weekends", "Night"],
      }).success,
    ).toBe(true);
  });
});
