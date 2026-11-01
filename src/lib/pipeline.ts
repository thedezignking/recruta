import { z } from "zod";

/** Interviews, offers and placements (ADR 0008). */
const reason = z
  .string()
  .trim()
  .min(5, "Add at least five characters.")
  .max(2000);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));
const optionalDate = z.iso.date().optional().or(z.literal(""));
const expected = z.iso.datetime({ offset: true });

export const interviewFormats = ["video", "phone", "in_person"] as const;
export const interviewOutcomes = ["advance", "hold", "decline"] as const;
export const salaryPeriods = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "annually",
] as const;

const endsAfterStart = {
  message: "The end time must be after the start time.",
  path: ["endsAt"],
};
const timesInOrder = (v: { startsAt: string; endsAt: string }) =>
  new Date(v.endsAt) > new Date(v.startsAt);

export const pipelineActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("schedule_interview"),
      id: z.uuid(),
      title: z.string().trim().min(1).max(120),
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
      timezone: z.string().trim().min(1).max(64),
      format: z.enum(interviewFormats),
      location: optionalText(500),
      interviewerIds: z.array(z.uuid()).max(10).default([]),
      guests: optionalText(500),
    })
    .refine(timesInOrder, endsAfterStart),
  z
    .object({
      action: z.literal("reschedule_interview"),
      id: z.uuid(),
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
      location: optionalText(500),
    })
    .refine(timesInOrder, endsAfterStart),
  z.object({ action: z.literal("cancel_interview"), id: z.uuid(), reason }),
  z.object({ action: z.literal("no_show_interview"), id: z.uuid() }),
  z.object({
    action: z.literal("complete_interview"),
    id: z.uuid(),
    outcome: z.enum(interviewOutcomes),
    note: reason,
  }),
  z.object({
    action: z.literal("save_offer"),
    id: z.uuid(),
    salaryAmount: z.coerce
      .number()
      .min(0)
      .max(1e12)
      .optional()
      .or(z.literal("")),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code.")
      .optional()
      .or(z.literal("")),
    salaryPeriod: z.enum(salaryPeriods).optional().or(z.literal("")),
    startDate: optionalDate,
    expiresAt: optionalDate,
    notes: optionalText(2000),
  }),
  z.object({
    action: z.literal("extend_offer"),
    id: z.uuid(),
    expectedUpdatedAt: expected,
  }),
  z
    .object({
      action: z.literal("decide_offer"),
      id: z.uuid(),
      decision: z.enum(["accepted", "declined", "withdrawn", "expired"]),
      startDate: optionalDate,
      reason: z.string().trim().max(2000).optional(),
    })
    .refine((v) => v.decision === "accepted" || (v.reason ?? "").length >= 5, {
      message: "Add at least five characters.",
      path: ["reason"],
    }),
  z.object({
    action: z.literal("record_placement"),
    id: z.uuid(),
    offerId: z.uuid(),
    startDate: optionalDate,
    feeAmount: z.coerce.number().min(0).max(1e12).optional().or(z.literal("")),
    feeCurrency: optionalText(3),
    expectedUpdatedAt: expected,
  }),
  z.object({ action: z.literal("start_placement"), id: z.uuid() }),
  z.object({
    action: z.literal("placement_fell_through"),
    id: z.uuid(),
    reason,
    returnTo: z.enum(["offer", "withdrawn"]),
    expectedUpdatedAt: expected,
  }),
]);
export type PipelineAction = z.input<typeof pipelineActionSchema>;

export const interviewFormatLabels: Record<string, string> = {
  video: "Video call",
  phone: "Phone call",
  in_person: "In person",
};
export const interviewStatusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
export const interviewOutcomeLabels: Record<string, string> = {
  advance: "Recommend advancing",
  hold: "On hold",
  decline: "Recommend declining",
};
export const offerStatusLabels: Record<string, string> = {
  draft: "Draft",
  extended: "Extended",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
};
export const placementStatusLabels: Record<string, string> = {
  pending_start: "Starting soon",
  started: "Started",
  fell_through: "Fell through",
};

/** Applications that can have interviews booked. */
export const interviewStages = [
  "shortlisted",
  "client_review",
  "interview",
  "offer",
] as const;
