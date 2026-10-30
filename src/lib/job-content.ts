import { z } from "zod";

export const arrangements = [
  "permanent",
  "fixed_term",
  "temporary",
  "freelance",
  "consultancy",
  "internship",
  "apprenticeship",
  "volunteer",
  "other",
] as const;
export const arrangementLabels: Record<string, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed-term contract",
  temporary: "Temporary",
  freelance: "Freelance",
  consultancy: "Consultancy",
  internship: "Internship",
  apprenticeship: "Apprenticeship",
  volunteer: "Volunteer",
  other: "Other",
};
// A single, industry-standard "Employment type" that maps onto the richer
// arrangement/hours data model so the form shows one familiar field, not two.
export const employmentTypeOptions = [
  ["full_time", "Full-time"],
  ["part_time", "Part-time"],
  ["contract", "Contract"],
  ["temporary", "Temporary"],
  ["internship", "Internship"],
  ["freelance", "Freelance"],
  ["volunteer", "Volunteer"],
] as const;

export function employmentTypeToModel(type: string): {
  employmentArrangement: string;
  workingHours: string;
} {
  switch (type) {
    case "full_time":
      return { employmentArrangement: "permanent", workingHours: "full_time" };
    case "part_time":
      return { employmentArrangement: "permanent", workingHours: "part_time" };
    case "contract":
      return {
        employmentArrangement: "fixed_term",
        workingHours: "not_specified",
      };
    case "temporary":
      return {
        employmentArrangement: "temporary",
        workingHours: "not_specified",
      };
    case "internship":
      return {
        employmentArrangement: "internship",
        workingHours: "not_specified",
      };
    case "freelance":
      return {
        employmentArrangement: "freelance",
        workingHours: "not_specified",
      };
    case "volunteer":
      return {
        employmentArrangement: "volunteer",
        workingHours: "not_specified",
      };
    default:
      return { employmentArrangement: "", workingHours: "not_specified" };
  }
}

export function modelToEmploymentType(
  arrangement?: string | null,
  hours?: string | null,
): string {
  switch (arrangement) {
    case "permanent":
      return hours === "part_time" ? "part_time" : "full_time";
    case "fixed_term":
      return "contract";
    case "temporary":
      return "temporary";
    case "internship":
    case "apprenticeship":
      return "internship";
    case "freelance":
    case "consultancy":
      return "freelance";
    case "volunteer":
      return "volunteer";
    default:
      return "";
  }
}

export const priorityDescriptions: Record<string, string> = {
  low: "Exploratory or future hiring; work after active commitments.",
  normal: "Standard hiring; follow the agreed recruitment timeline.",
  high: "Time-sensitive vacancy; prioritize sourcing and review.",
  urgent: "Immediate business impact; agree an accelerated plan with the team.",
};
export const contentShape = {
  employmentArrangement: z.enum(arrangements).optional().or(z.literal("")),
  workingHours: z
    .enum(["full_time", "part_time", "flexible", "not_specified"])
    .default("not_specified"),
  contractDuration: z.string().trim().max(160).optional(),
  remoteEligibility: z
    .enum(["anywhere", "restricted"])
    .optional()
    .or(z.literal("")),
  remoteDetails: z.string().trim().max(500).optional(),
  salaryVisibility: z
    .enum(["public", "hidden", "negotiable"])
    .default("public"),
  salaryBasis: z
    .enum(["gross", "net", "not_specified"])
    .default("not_specified"),
  hiringReason: z
    .enum(["growth", "replacement", "project", "seasonal", "other"])
    .optional()
    .or(z.literal("")),
  targetStartDate: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .refine(
      (v) =>
        !v ||
        (!Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v),
      "Use a valid date.",
    )
    .optional(),
  sourcingBrief: z.string().trim().max(5000).optional(),
};
export const screeningQuestionSchema = z
  .object({
    label: z.string().trim().min(2).max(240),
    helpText: z.string().trim().max(500).default(""),
    questionType: z.enum([
      "short_text",
      "long_text",
      "yes_no",
      "single_select",
    ]),
    options: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    isRequired: z.boolean().default(false),
  })
  .superRefine((q, ctx) => {
    if (
      q.questionType === "single_select" &&
      (q.options.length < 2 ||
        new Set(q.options.map((s) => s.toLowerCase())).size !==
          q.options.length)
    )
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Add at least two different answer options.",
      });
    if (q.questionType !== "single_select" && q.options.length)
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Answer options only apply to Choose one questions.",
      });
  });
export const libraryMutationSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
  category: z.string().trim().min(1).max(80),
  archived: z.boolean().default(false),
  question: screeningQuestionSchema,
});
export type LibraryQuestion = z.output<typeof screeningQuestionSchema> & {
  id: string;
  category: string;
  version: number;
  archived: boolean;
};

export function legacyEmployment(value: string | null | undefined) {
  const v = value?.toLowerCase();
  return {
    employmentArrangement:
      (
        {
          contract: "fixed_term",
          temporary: "temporary",
          freelance: "freelance",
          consultancy: "consultancy",
          internship: "internship",
          apprenticeship: "apprenticeship",
          volunteer: "volunteer",
          other: "other",
        } as Record<string, string>
      )[v ?? ""] ?? "",
    workingHours:
      v === "full-time"
        ? "full_time"
        : v === "part-time"
          ? "part_time"
          : "not_specified",
  };
}
