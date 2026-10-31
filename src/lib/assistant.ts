import { z } from "zod";
import { applicationStatusSchema } from "@/lib/applicant-operations";

/** Ask Recruta request/response contracts (ADR 0007). */
export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export type AssistantMessage = z.output<typeof assistantMessageSchema>;

export const assistantRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(20),
});

/** A change the assistant proposes; nothing happens until a person confirms. */
export const stageChangeProposalSchema = z.object({
  type: z.literal("stage_change"),
  applicationId: z.uuid(),
  candidateName: z.string(),
  jobTitle: z.string(),
  from: applicationStatusSchema,
  to: applicationStatusSchema,
  reason: z.string().max(2000),
  reasonRequired: z.boolean(),
  expectedUpdatedAt: z.string(),
});
export type StageChangeProposal = z.output<typeof stageChangeProposalSchema>;

export const assistantReplySchema = z.object({
  reply: z.string(),
  actions: z.array(stageChangeProposalSchema),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
});
export type AssistantReply = z.output<typeof assistantReplySchema>;

export const assistantSuggestions = [
  "Who are the strongest candidates waiting for review?",
  "Which applications are missing information?",
  "Summarise the pipeline for my open jobs",
  "Draft a polite update for candidates still in review",
];
