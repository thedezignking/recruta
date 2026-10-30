import { z } from "zod";
import { organizationDetailsSchema } from "./organization";
import { contentShape } from "./job-content";

export const agencyRoleSchema = z.enum([
  "owner",
  "administrator",
  "recruitment_manager",
  "recruiter",
]);
export const clientRoleSchema = z.enum([
  "client_administrator",
  "hiring_manager",
  "reviewer",
]);

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  agencyName: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  contactEmail: z.string().trim().email(),
  countryCode: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase()),
  timezone: z.string().min(1),
  specialization: z.string().trim().max(160).optional(),
});

export const agencyProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contactEmail: z.string().trim().email(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(120),
  primarySpecialization: z.string().trim().max(160).optional(),
});

export const agencyInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["administrator", "recruitment_manager", "recruiter"]),
});

export const clientInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["client_administrator", "hiring_manager", "reviewer"]),
});

export const invitationAcceptanceSchema = z.object({
  token: z.string().min(32).max(256),
  kind: z.enum(["agency", "client"]),
});

export const attachmentUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const requestMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  visibility: z
    .enum(["client_visible", "agency_private"])
    .default("client_visible"),
});

export const clientSchema = organizationDetailsSchema.extend({
  primaryContact: z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email(),
      jobTitle: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .optional(),
});

export const requestRequirementSchema = z.object({
  type: z.enum(["required", "preferred"]),
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
});

export const hiringRequestSchema = z
  .object({
    clientId: z.string().uuid(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(20).max(10000),
    department: z.string().trim().max(120).optional(),
    positionsRequired: z.coerce.number().int().min(1).max(1000),
    location: z.string().trim().max(160).optional(),
    employmentType: z.string().trim().max(80).optional(),
    workArrangement: z.enum(["on_site", "hybrid", "remote"]),
    salaryMin: z.coerce.number().nonnegative().optional(),
    salaryMax: z.coerce.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    targetHireDate: z.coerce.date().optional(),
    additionalInstructions: z.string().trim().max(5000).optional(),
    requirements: z.array(requestRequirementSchema).max(50).default([]),
  })
  .refine(
    (value) =>
      value.salaryMin === undefined ||
      value.salaryMax === undefined ||
      value.salaryMax >= value.salaryMin,
    {
      path: ["salaryMax"],
      message:
        "Maximum salary must be greater than or equal to minimum salary.",
    },
  );

export const clarificationSchema = z.object({
  message: z.string().trim().min(3).max(5000),
});

export const convertToJobSchema = z.object({
  workflowTemplateId: z.string().uuid(),
  deadlineAt: z.coerce.date(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  primaryRecruiterId: z.string().uuid(),
});

export const jobAssignmentSchema = z.object({
  userId: z.string().uuid(),
  assignmentRole: z.enum(["primary", "collaborator", "manager"]),
});

export const jobTransitionSchema = z.object({
  status: z.enum(["open", "on_hold", "filled", "cancelled", "closed_unfilled"]),
});

export const manualJobSchema = z
  .object({
    ...contentShape,
    clientId: z.string().uuid().nullable().optional(),
    newOrganization: organizationDetailsSchema.optional(),
    title: z.string().trim().min(2).max(160),
    description: z
      .string()
      .trim()
      .min(
        20,
        "Add a job description of at least 20 characters before publishing.",
      )
      .max(20000)
      .refine((value) => !/\[(?:Describe|List) [^\]]+\]/.test(value), {
        message: "Replace the outline guidance with details about this role.",
      }),
    department: z.string().trim().max(120).optional(),
    positionsRequired: z.coerce.number().int().min(1).max(1000),
    location: z.string().trim().max(160).optional(),
    employmentType: z.string().trim().max(80).optional(),
    workArrangement: z.enum(["on_site", "hybrid", "remote"], {
      error: "Choose a workplace type before publishing.",
    }),
    experienceMinYears: z
      .union([
        z.literal("").transform(() => undefined),
        z.coerce.number().int().min(0).max(50),
      ])
      .optional(),
    seniorityLevel: z
      .enum(["entry", "mid", "senior", "lead", "executive"])
      .optional()
      .or(z.literal("")),
    salaryMin: z
      .union([
        z.literal("").transform(() => undefined),
        z.coerce.number().nonnegative(),
      ])
      .optional(),
    salaryMax: z
      .union([
        z.literal("").transform(() => undefined),
        z.coerce.number().nonnegative(),
      ])
      .optional(),
    currency: z.string().trim().length(3).optional().or(z.literal("")),
    salaryPeriod: z
      .enum(["hourly", "daily", "weekly", "monthly", "annually"])
      .optional(),
    deadlineAt: z
      .union([z.literal("").transform(() => undefined), z.coerce.date()])
      .optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    workflowTemplateId: z.string().uuid().optional().or(z.literal("")),
    primaryRecruiterId: z.string().uuid().optional().or(z.literal("")),
    applicationFormIntro: z.string().trim().max(1200).optional(),
    requirements: z.array(requestRequirementSchema).max(50).default([]),
    questions: z
      .array(
        z.object({
          label: z.string().trim().min(2).max(240),
          helpText: z.string().trim().max(500).optional(),
          questionType: z
            .enum(["short_text", "long_text", "yes_no", "single_select"])
            .default("long_text"),
          options: z
            .array(z.string().trim().min(1).max(120))
            .max(20)
            .default([]),
          isRequired: z.boolean().default(false),
        }),
      )
      .max(20)
      .default([]),
    publish: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    refineJobOrganizationAndSalary(value, context);
    if (!value.employmentArrangement)
      context.addIssue({
        code: "custom",
        path: ["employmentArrangement"],
        message: "Choose an employment arrangement before publishing.",
      });
    if (
      ["on_site", "hybrid"].includes(value.workArrangement) &&
      !value.location?.trim()
    )
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Add the city, region or address for on-site or hybrid work.",
      });
    if (value.workArrangement === "remote" && !value.remoteEligibility)
      context.addIssue({
        code: "custom",
        path: ["remoteEligibility"],
        message: "Choose where remote candidates can work.",
      });
    if (
      value.workArrangement === "remote" &&
      value.remoteEligibility === "restricted" &&
      !value.remoteDetails?.trim()
    )
      context.addIssue({
        code: "custom",
        path: ["remoteDetails"],
        message: "Describe eligible countries, regions or time zones.",
      });
    if (
      ["fixed_term", "temporary"].includes(value.employmentArrangement ?? "") &&
      !value.contractDuration?.trim()
    )
      context.addIssue({
        code: "custom",
        path: ["contractDuration"],
        message: "Add the contract duration or expected end point.",
      });
    value.questions.forEach((question, index) => {
      if (question.questionType !== "single_select" && question.options.length)
        context.addIssue({
          code: "custom",
          path: ["questions", index, "options"],
          message: "Answer options only apply to Choose one questions.",
        });
      if (
        question.questionType === "single_select" &&
        (question.options.length < 2 ||
          new Set(question.options.map((option) => option.toLowerCase()))
            .size !== question.options.length)
      ) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "options"],
          message: "Add at least two different answer options.",
        });
      }
    });
  });

function refineJobOrganizationAndSalary(
  value: {
    clientId?: string | null;
    newOrganization?: unknown;
    salaryMin?: number;
    salaryMax?: number;
  },
  context: z.RefinementCtx,
) {
  if (!value.clientId && !value.newOrganization) {
    context.addIssue({
      code: "custom",
      path: ["clientId"],
      message: "Choose an organization or create one here.",
    });
  }
  if (
    value.salaryMin !== undefined &&
    value.salaryMax !== undefined &&
    value.salaryMax < value.salaryMin
  ) {
    context.addIssue({
      code: "custom",
      path: ["salaryMax"],
      message: "Maximum salary must be at least the minimum salary.",
    });
  }
}

// Drafts retain unfinished work; publication keeps the complete role contract.
export const jobDraftSchema = z
  .object({
    ...manualJobSchema.shape,
    description: z.string().max(20000).default(""),
    workArrangement: z.enum(["on_site", "hybrid", "remote"]).optional(),
    requirements: z
      .array(requestRequirementSchema.extend({ label: z.string().max(160) }))
      .max(50)
      .default([]),
    questions: z
      .array(
        z.object({
          label: z.string().max(240),
          helpText: z.string().max(500).optional(),
          questionType: z
            .enum(["short_text", "long_text", "yes_no", "single_select"])
            .default("long_text"),
          options: z.array(z.string().max(120)).max(20).default([]),
          isRequired: z.boolean().default(false),
        }),
      )
      .max(20)
      .default([]),
    publish: z.literal(false).default(false),
  })
  .superRefine(refineJobOrganizationAndSalary);

export const publicApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  linkedinUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  coverNote: z.string().trim().max(5000).optional(),
  consent: z.literal("true"),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: z.union([z.string().max(5000), z.boolean()]),
      }),
    )
    .max(20)
    .default([]),
});
