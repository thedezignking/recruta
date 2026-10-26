import { z } from "zod";

export const processingSettingsSchema = z
  .strictObject({
    screeningEnabled: z.boolean(),
    automaticScreening: z.boolean(),
    acknowledgeApplications: z.boolean(),
    reviewReminderHours: z.number().int().min(1).max(720),
  })
  .refine((value) => !value.automaticScreening || value.screeningEnabled, {
    message: "Enable screening before automatic processing.",
  });
export const defaultProcessingSettings = {
  screeningEnabled: false,
  automaticScreening: false,
  acknowledgeApplications: true,
  reviewReminderHours: 24,
};
export const screeningCorrectionSchema = z.strictObject({
  id: z.uuid(),
  runId: z.uuid(),
  requirementId: z.uuid(),
  verdict: z.enum(["supported", "not_found", "contradicted", "unclear"]),
  explanation: z.string().trim().min(5).max(2000),
});
export const candidateMessageSchema = z
  .strictObject({
    kind: z.enum([
      "custom",
      "missing_information",
      "status_update",
      "rejection",
    ]),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine(
        (value) => !/[\r\n]/.test(value),
        "Use one line for the subject.",
      ),
    body: z.string().trim().min(1).max(10000),
    confirmed: z.boolean().default(false),
  })
  .refine((value) => value.kind !== "rejection" || value.confirmed, {
    message: "Review and confirm the rejection message before queuing it.",
  });
export const screeningVerdicts = {
  supported: "Supported",
  not_found: "Not found in the material",
  contradicted: "Contradicted",
  unclear: "Needs clarification",
} as const;
export const messageTemplates = {
  custom: { label: "Write a message", subject: "", body: "" },
  missing_information: {
    label: "Request information",
    subject: "A little more information about your application",
    body: "Thanks for your application. Could you please reply with the following information?\n\n",
  },
  status_update: {
    label: "Application update",
    subject: "An update on your application",
    body: "Thanks for your interest. We wanted to share an update on your application.\n\n",
  },
  rejection: {
    label: "Rejection",
    subject: "An update on your application",
    body: "Thank you for taking the time to apply. After reviewing your application, we will not be moving forward for this role. We appreciate your interest and wish you well in your search.",
  },
} as const;
