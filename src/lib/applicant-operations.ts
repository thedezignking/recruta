import { z } from "zod";
import { matchFilterValues, matchSummarySchema } from "@/lib/match-grade";
import type { ApplicationStatus } from "@/types/domain";

export const applicationStatuses = [
  "received",
  "in_review",
  "shortlisted",
  "client_review",
  "interview",
  "offer",
  "placed",
  "rejected",
  "withdrawn",
] as const;
export const applicationStatusSchema = z.enum(applicationStatuses);
export const applicationTransitions: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  received: ["in_review", "rejected", "withdrawn"],
  in_review: ["shortlisted", "rejected", "withdrawn"],
  shortlisted: [
    "in_review",
    "client_review",
    "interview",
    "rejected",
    "withdrawn",
  ],
  client_review: [
    "in_review",
    "shortlisted",
    "interview",
    "rejected",
    "withdrawn",
  ],
  interview: ["shortlisted", "offer", "rejected", "withdrawn"],
  offer: ["interview", "rejected", "withdrawn"],
  placed: [],
  rejected: ["in_review"],
  withdrawn: ["in_review"],
};
export function transitionNeedsReason(
  from: ApplicationStatus,
  to: ApplicationStatus,
) {
  return [from, to].some(
    (status) => status === "rejected" || status === "withdrawn",
  );
}
const optionalValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema.optional(),
  );
export const applicationFiltersSchema = z
  .object({
    submittedFrom: optionalValue(z.iso.date()),
    submittedTo: optionalValue(z.iso.date()),
    q: optionalValue(z.string().trim().max(100)),
    jobId: optionalValue(z.uuid()),
    candidateId: optionalValue(z.uuid()),
    status: optionalValue(applicationStatusSchema),
    processingStatus: optionalValue(
      z.enum(["pending", "extracting", "ready", "needs_information", "failed"]),
    ),
    source: optionalValue(z.enum(["public_form", "manual", "imported"])),
    owner: optionalValue(z.enum(["mine", "unassigned"])),
    match: optionalValue(z.enum(matchFilterValues)),
    cursor: optionalValue(
      z
        .string()
        .max(300)
        .regex(/^[A-Za-z0-9_-]+$/),
    ),
  })
  .refine(
    (v) =>
      !v.submittedFrom || !v.submittedTo || v.submittedFrom <= v.submittedTo,
    {
      path: ["submittedTo"],
      message: "The end date must be on or after the start date.",
    },
  );
export type ApplicationFilters = z.output<typeof applicationFiltersSchema>;
export const applicationCursorSchema = z.object({
  at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export const applicationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("transition"),
    status: applicationStatusSchema,
    reason: z.string().trim().max(2000).default(""),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    action: z.literal("assign"),
    ownerUserId: z.uuid().nullable(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    action: z.literal("note"),
    noteId: z.uuid(),
    body: z.string().trim().min(1, "Write a note first.").max(5000),
  }),
]);
export type ApplicationAction = z.output<typeof applicationActionSchema>;

export const applicationListItemSchema = z.object({
  id: z.uuid(),
  status: applicationStatusSchema,
  processing_status: z.string(),
  source: z.string(),
  submitted_at: z.string(),
  owner_user_id: z.uuid().nullable(),
  owner_name: z.string().nullable(),
  match: matchSummarySchema.nullable().optional(),
  candidates: z.object({
    id: z.uuid(),
    full_name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  jobs: z.object({
    id: z.uuid(),
    title: z.string(),
    public_slug: z.string().nullable(),
    clients: z.object({ name: z.string() }),
  }),
});
export const applicationInboxSchema = z.object({
  items: z.array(applicationListItemSchema),
  total: z.number(),
  nextCursor: applicationCursorSchema.nullable(),
});
export type ApplicationListItem = z.output<typeof applicationListItemSchema>;

export type ApplicationDetail = {
  id: string;
  agency_id: string;
  job_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  processing_status: string;
  source: string;
  submitted_at: string;
  updated_at: string;
  owner_user_id: string | null;
  cover_note: string | null;
  submitted_profile: {
    fullName?: string;
    phone?: string;
    linkedinUrl?: string;
  };
  candidates: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    linkedin_url: string | null;
    email_suppressed: boolean;
  };
  jobs: {
    id: string;
    title: string;
    clients: { name: string };
    job_assignments: { user_id: string }[];
  };
  candidate_documents: {
    id: string;
    file_name: string;
    size_bytes: number;
    content_type: string;
  }[];
  application_answers: {
    id: string;
    answer: unknown;
    job_application_questions: { label: string; sort_order: number };
  }[];
};

/** Short reference shown to candidates; mirrors public.application_reference. */
export function applicationReference(id: string) {
  return `APP-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
